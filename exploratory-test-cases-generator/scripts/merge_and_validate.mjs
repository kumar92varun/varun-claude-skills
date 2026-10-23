#!/usr/bin/env node
/**
 * Merge per-page work files into the single deliverable, validate against the field contract, preserve
 * downstream sync IDs across re-runs, and compute the coverage summary.
 *
 *   node scripts/merge_and_validate.mjs [options]
 *     --work <dir>        directory of per-page files      (default ./.work)
 *     --out <file>        merged test cases output         (default ./test-cases.json)
 *     --findings <file>   merged findings output           (default ./findings.json)
 *     --coverage <file>   coverage markdown                (default ./coverage.md)
 *     --meta <file>       meta block to embed              (default ./.work/meta.json if present)
 *     --prev <file>       previous test-cases.json for sync preservation + diff (default: the --out file)
 *     --pages <file>      pages.json for the pages[] section (default ./pages.json)
 *
 * Per-page files:
 *   .work/<page>.json            -> an array of test cases, OR { testCases:[...], sharedTestData:{...} }
 *   .work/findings-<page>.json   -> { findings:[...], qaAutoDataCreated:[...] } or a bare findings array
 *
 * The validator is the enforcement side of references/json-contract.md. It fails the run (exit 1) on a
 * missing required field or an illegal enum value, after writing a report of every problem, so nothing
 * malformed reaches the downstream push skill.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';

const opt = parseArgs(process.argv.slice(2));
const WORK = resolve(opt.work || './.work');
const OUT = resolve(opt.out || './test-cases.json');
const FINDINGS = resolve(opt.findings || './findings.json');
const COVERAGE = resolve(opt.coverage || './coverage.md');
const PREV = resolve(opt.prev || OUT);
const PAGES = resolve(opt.pages || './pages.json');
const META = resolve(opt.meta || join(WORK, 'meta.json'));

const REQUIRED = ['id', 'fingerprint', 'title', 'group', 'pageId', 'category', 'priority', 'severity',
                  'steps', 'expectedResult', 'basis', 'confidence', 'status', 'sync'];
const ENUMS = {
  category: ['functional','ui','negative','boundary','flakiness','accessibility','security','performance',
             'responsive','state-navigation','usability','network-failure','e2e-journey'],
  priority: ['P0','P1','P2','P3'],
  severity: ['Critical','Major','Minor','Trivial'],
  basis: ['observed','inferred'],
  confidence: ['high','medium','low'],
  status: ['draft','added','changed','obsolete'],
};

if (!existsSync(WORK)) { console.error(`Work dir not found: ${WORK}`); process.exit(1); }

// ---- collect test cases + shared data from per-page files ---------------------------------------
let cases = [];
let sharedTestData = {};
const files = readdirSync(WORK).filter(f => f.endsWith('.json'));
for (const f of files) {
  if (f.startsWith('findings-') || f === 'meta.json' || f === 'progress.json') continue;
  const data = JSON.parse(readFileSync(join(WORK, f), 'utf8'));
  const arr = Array.isArray(data) ? data : (data.testCases || []);
  if (!Array.isArray(data) && data.sharedTestData) sharedTestData = deepMerge(sharedTestData, data.sharedTestData);
  for (const c of arr) { c._source = f; cases.push(c); }
}

// ---- validate -----------------------------------------------------------------------------------
const problems = [];
const seenIds = new Set();
for (const c of cases) {
  const where = `${c.id || '(no id)'} [${c._source}]`;
  for (const r of REQUIRED) if (c[r] === undefined || c[r] === null || c[r] === '')
    problems.push(`${where}: missing required field "${r}"`);
  for (const [k, vals] of Object.entries(ENUMS))
    if (c[k] !== undefined && !vals.includes(c[k]))
      problems.push(`${where}: "${k}" = "${c[k]}" not in {${vals.join(', ')}}`);
  if (c.id) { if (seenIds.has(c.id)) problems.push(`${where}: duplicate id`); seenIds.add(c.id); }
  if (Array.isArray(c.steps)) {
    c.steps.forEach((s, i) => {
      if (!s.action) problems.push(`${where}: step ${i + 1} missing "action"`);
      if (s.locator && typeof s.locator === 'object' && !s.locator.strategy)
        problems.push(`${where}: step ${i + 1} locator missing "strategy"`);
    });
  } else problems.push(`${where}: "steps" must be an array`);
  delete c._source;
}

// ---- dedup by fingerprint (keep highest priority) -----------------------------------------------
const byFp = new Map();
const rank = { P0: 0, P1: 1, P2: 2, P3: 3 };
for (const c of cases) {
  const fp = c.fingerprint;
  if (!fp) { byFp.set(Symbol(), c); continue; }
  const existing = byFp.get(fp);
  if (!existing || (rank[c.priority] ?? 9) < (rank[existing.priority] ?? 9)) byFp.set(fp, c);
}
const merged = [...byFp.values()];

// ---- preserve sync IDs + diff status against previous run ---------------------------------------
// `draft` = first-ever generation (no previous run). On a re-run we set the delta: `added` (new this run),
// `changed` (shape differs), `obsolete` (gone). An unchanged case keeps its prior status, and downstream
// sync IDs are always carried forward so updates land on the same Jira issue / Notion row.
let prevByFp = new Map();
if (existsSync(PREV)) {
  try {
    const prev = JSON.parse(readFileSync(PREV, 'utf8'));
    for (const c of (prev.testCases || [])) if (c.fingerprint) prevByFp.set(c.fingerprint, c);
  } catch { /* unreadable/first run: nothing to preserve */ }
}
const hadPrevRun = prevByFp.size > 0;
const currentFps = new Set(merged.map(c => c.fingerprint));
for (const c of merged) {
  const prior = prevByFp.get(c.fingerprint);
  if (prior && prior.sync && Object.keys(prior.sync).length && (!c.sync || !Object.keys(c.sync).length))
    c.sync = prior.sync;                                    // carry downstream IDs forward
  if (!hadPrevRun)            c.status = 'draft';
  else if (!prior)           c.status = 'added';
  else if (!sameShape(prior, c)) c.status = 'changed';
  else                        c.status = prior.status === 'obsolete' ? 'changed' : (prior.status || 'added');
}
// carry forward obsolete cases (kept, never deleted, so sync IDs survive)
for (const [fp, prior] of prevByFp) {
  if (!currentFps.has(fp)) { prior.status = 'obsolete'; merged.push(prior); }
}

// ---- merge findings -----------------------------------------------------------------------------
let findings = [], qaAuto = [];
for (const f of files.filter(f => f.startsWith('findings-'))) {
  const data = JSON.parse(readFileSync(join(WORK, f), 'utf8'));
  const arr = Array.isArray(data) ? data : (data.findings || []);
  findings.push(...arr);
  if (!Array.isArray(data) && data.qaAutoDataCreated) qaAuto.push(...data.qaAutoDataCreated);
}

// ---- coverage -----------------------------------------------------------------------------------
const pages = (() => {
  if (!existsSync(PAGES)) return [];
  try { const r = JSON.parse(readFileSync(PAGES, 'utf8')); return Array.isArray(r) ? r : (r.pages || []); }
  catch { console.warn(`Warning: could not parse ${PAGES}; coverage will omit page-level gaps.`); return []; }
})();
const count = (key) => merged.reduce((m, c) => (m[c[key]] = (m[c[key]] || 0) + 1, m), {});
const selected = pages.filter(p => p.include !== false);
const pagesWithTests = new Set(merged.map(c => c.pageId));
const coverage = {
  totals: { testCases: merged.length, findings: findings.length,
            pagesSelected: selected.length, pagesExplored: pages.filter(p => p.explored).length },
  byCategory: count('category'), byPriority: count('priority'), byGroup: count('group'),
  gaps: {
    pagesWithNoTests: selected.filter(p => !pagesWithTests.has(p.id)).map(p => p.id),
    casesWithNoAssertions: merged.filter(c => !hasAssertion(c)).map(c => c.id),
    categoriesEmpty: ENUMS.category.filter(cat => !merged.some(c => c.category === cat)),
  },
};

// ---- write --------------------------------------------------------------------------------------
if (problems.length) {
  console.error(`\nValidation failed — ${problems.length} problem(s):`);
  for (const p of problems.slice(0, 50)) console.error('  - ' + p);
  if (problems.length > 50) console.error(`  …and ${problems.length - 50} more`);
  writeFileSync('validation-report.txt', problems.join('\n'));
  console.error('\nFull report: validation-report.txt  — fix the per-page .work files and re-run.');
  process.exit(1);
}

const meta = existsSync(META) ? JSON.parse(readFileSync(META, 'utf8')) : { schemaVersion: '1.0.0' };
meta.generatedAt = new Date().toISOString();
meta.generator = 'exploratory-test-cases-generator';

writeFileSync(OUT, JSON.stringify({ meta, pages, sharedTestData, testCases: merged, coverage }, null, 2));
writeFileSync(FINDINGS, JSON.stringify(
  { generatedAt: meta.generatedAt, findings, qaAutoDataCreated: qaAuto }, null, 2));
writeFileSync(COVERAGE, coverageMarkdown(coverage, findings.length));

console.log(`OK — ${merged.length} test cases → ${basename(OUT)}`);
console.log(`     ${findings.length} findings → ${basename(FINDINGS)}`);
if (coverage.gaps.pagesWithNoTests.length)
  console.log(`     ⚠ pages with no tests: ${coverage.gaps.pagesWithNoTests.join(', ')}`);
if (coverage.gaps.casesWithNoAssertions.length)
  console.log(`     ⚠ cases with no assertion: ${coverage.gaps.casesWithNoAssertions.length}`);

// ---- helpers ------------------------------------------------------------------------------------
function hasAssertion(c) {
  if (c.expectedResult && c.expectedResult.trim()) return true;
  return Array.isArray(c.steps) && c.steps.some(s => s.action === 'assert' || (s.expected && s.expected.trim()));
}
function sameShape(a, b) {
  return a.title === b.title && a.expectedResult === b.expectedResult &&
         JSON.stringify(a.steps) === JSON.stringify(b.steps);
}
function coverageMarkdown(c, nFindings) {
  const kv = o => Object.entries(o).map(([k, v]) => `- ${k}: ${v}`).join('\n') || '- (none)';
  return `# Coverage summary

**${c.totals.testCases}** test cases · **${nFindings}** findings · ` +
`**${c.totals.pagesExplored}/${c.totals.pagesSelected}** selected pages explored

## By category
${kv(c.byCategory)}

## By priority
${kv(c.byPriority)}

## By group
${kv(c.byGroup)}

## Gaps
- Pages with no tests: ${c.gaps.pagesWithNoTests.join(', ') || 'none'}
- Cases with no assertion: ${c.gaps.casesWithNoAssertions.join(', ') || 'none'}
- Empty categories: ${c.gaps.categoriesEmpty.join(', ') || 'none'}
`;
}
function deepMerge(a, b) {
  const out = { ...a };
  for (const [k, v] of Object.entries(b))
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? deepMerge(a[k] || {}, v) : v;
  return out;
}
function parseArgs(a) {
  const o = {}; for (let i = 0; i < a.length; i += 2) if (a[i].startsWith('--')) o[a[i].slice(2)] = a[i + 1];
  return o;
}
