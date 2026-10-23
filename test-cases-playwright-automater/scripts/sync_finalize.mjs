#!/usr/bin/env node
/**
 * Finalise a run: rewrite .sync/last.json (new JSON snapshot + fresh generated-file hashes) and write
 * sync-report.md from .sync/plan.json plus optional run results.
 *
 *   node scripts/sync_finalize.mjs <test-cases.json> --project <dir> [--results <playwright-results.json>]
 *       [--fixmes <file>] [--todos <file>]
 *
 * --results: Playwright's JSON reporter output, to list failing tests as candidate findings.
 * --fixmes / --todos: optional newline-delimited lists the generator collected while writing specs.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join, relative } from 'node:path';

const [casesPath] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const opt = parseArgs(process.argv.slice(2));
if (!casesPath || !opt.project) { console.error('Usage: node sync_finalize.mjs <test-cases.json> --project <dir> [--results f] [--fixmes f] [--todos f]'); process.exit(1); }

const PROJ = resolve(opt.project);
const incoming = JSON.parse(readFileSync(resolve(casesPath), 'utf8'));
const plan = existsSync(join(PROJ, '.sync/plan.json')) ? JSON.parse(readFileSync(join(PROJ, '.sync/plan.json'), 'utf8')) : { added: [], changed: [], removed: [], customizedChanged: [], tampered: [], unchanged: 0 };

// capture the PRIOR snapshot's ids before we overwrite it, so removed cases still show their id in the report
const priorSnap = existsSync(join(PROJ, '.sync/last.json')) ? JSON.parse(readFileSync(join(PROJ, '.sync/last.json'), 'utf8')) : { cases: {} };
const priorIds = Object.fromEntries(Object.entries(priorSnap.cases || {}).map(([fp, v]) => [fp, v.id]));

// --- new snapshot ---
function caseHash(c) { const { status, sync, evidence, _source, ...s } = c; return sha256(JSON.stringify(s, Object.keys(s).sort())); }
const cases = {};
for (const c of (incoming.testCases || [])) cases[c.fingerprint] = { id: c.id, hash: caseHash(c) };

const generatedFiles = {};
for (const dir of ['tests', 'journeys', 'pages/generated']) {
  const d = join(PROJ, dir);
  if (!existsSync(d)) continue;
  for (const abs of filesUnder(d)) {
    if (abs.endsWith('.gitkeep')) continue;
    generatedFiles[relative(PROJ, abs)] = sha256(readFileSync(abs, 'utf8'));
  }
}
writeFileSync(join(PROJ, '.sync/last.json'),
  JSON.stringify({ snapshotAt: new Date().toISOString(), cases, generatedFiles }, null, 2));

// --- run results → candidate findings ---
let failing = [];
if (opt.results && existsSync(opt.results)) {
  try {
    const r = JSON.parse(readFileSync(opt.results, 'utf8'));
    failing = collectFailures(r);
  } catch { /* ignore malformed results */ }
}
const fixmes = listFrom(opt.fixmes);
const todos = listFrom(opt.todos);

// --- report ---
const idOf = fp => cases[fp]?.id || priorIds[fp] || fp;
const report = `# Sync report — ${new Date().toISOString().slice(0, 10)}

Added ${plan.added.length} · Changed ${plan.changed.length} · Removed ${plan.removed.length} · Unchanged ${plan.unchanged ?? 0}

## Added
${bullets(plan.added.map(idOf))}

## Changed
${bullets(plan.changed.map(idOf))}

## Removed
${bullets(plan.removed.map(idOf))}

## Review needed
${bullets([
  ...plan.customizedChanged.map(fp => `${idOf(fp)} — changed in JSON and has a custom override; confirm it still holds`),
  ...plan.tampered.map(f => `${f} — generated file was edited by hand; regenerated. Move that edit into a seam (pages/<Name>Page.ts or overrides/).`),
])}

## FIXME locators
${bullets(fixmes)}

## TODO assertions
${bullets(todos)}

## Candidate findings (tests left red — NOT auto-fixed)
${bullets(failing.map(f => `${f.title} — ${f.kind === 'assertion' ? 'assertion failed (possible real bug)' : 'infra failure'}: ${f.error}`))}
`;
writeFileSync(join(PROJ, 'sync-report.md'), report);

console.log(`Snapshot + report written. +${plan.added.length}/~${plan.changed.length}/-${plan.removed.length}, ${failing.length} failing test(s).`);

// ---- helpers ----
function sha256(s) { return createHash('sha256').update(s).digest('hex'); }
function filesUnder(d) { const out = []; for (const n of readdirSync(d)) { const a = join(d, n); statSync(a).isDirectory() ? out.push(...filesUnder(a)) : out.push(a); } return out; }
function bullets(arr) { return arr && arr.length ? arr.map(x => `- ${x}`).join('\n') : '- none'; }
function listFrom(p) { return p && existsSync(p) ? readFileSync(p, 'utf8').split('\n').map(s => s.trim()).filter(Boolean) : []; }
function collectFailures(r) {
  const out = [];
  const visit = (suite) => {
    for (const s of suite.suites || []) visit(s);
    for (const spec of suite.specs || []) for (const t of spec.tests || []) {
      const res = (t.results || []).at(-1);
      if (res && res.status !== 'passed' && res.status !== 'skipped') {
        const err = (res.error?.message || '').replace(/\s+/g, ' ').slice(0, 200);
        const kind = /expect|assert|toBe|toHave|toEqual|toContain/i.test(err) ? 'assertion' : 'infra';
        out.push({ title: spec.title, kind, error: err || res.status });
      }
    }
  };
  for (const s of r.suites || []) visit(s);
  return out;
}
function parseArgs(a) { const o = {}; for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { o[a[i].slice(2)] = a[i + 1]; i++; } return o; }
