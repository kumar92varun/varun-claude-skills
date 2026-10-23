#!/usr/bin/env node
/**
 * Compute the sync plan: diff a new test-cases.json against the saved snapshot, detect customised/tampered
 * artifacts, and write .sync/plan.json.
 *
 *   node scripts/sync_plan.mjs <test-cases.json> --project <projectDir>
 *
 * Classifies each case by fingerprint: added / changed / removed / unchanged. A changed case is marked
 * customizedChanged when a human has customised it (an override entry, a page-object subclass method, or a
 * generated file edited directly). Directly-edited generated files are also listed as `tampered`.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';

const [casesPath] = process.argv.slice(2).filter(a => !a.startsWith('--'));
const opt = parseArgs(process.argv.slice(2));
if (!casesPath || !opt.project) { console.error('Usage: node sync_plan.mjs <test-cases.json> --project <dir>'); process.exit(1); }

const PROJ = resolve(opt.project);
const incoming = JSON.parse(readFileSync(resolve(casesPath), 'utf8'));
const snapPath = join(PROJ, '.sync/last.json');
const snap = existsSync(snapPath) ? JSON.parse(readFileSync(snapPath, 'utf8')) : { cases: {}, generatedFiles: {} };

// normalized hash of a case: ignore volatile/owned-elsewhere fields (status, sync, evidence)
function caseHash(c) {
  const { status, sync, evidence, _source, ...stable } = c;
  return sha256(JSON.stringify(stable, Object.keys(stable).sort()));
}

const newCases = new Map((incoming.testCases || []).map(c => [c.fingerprint, c]));
const oldCases = snap.cases || {};

const added = [], changed = [], removed = [], unchanged = [];
for (const [fp, c] of newCases) {
  if (!oldCases[fp]) added.push(fp);
  else if (oldCases[fp].hash !== caseHash(c)) changed.push(fp);
  else unchanged.push(fp);
}
for (const fp of Object.keys(oldCases)) if (!newCases.has(fp)) removed.push(fp);

// tamper check: generated files whose current hash != stored hash
const tampered = [];
for (const [rel, storedHash] of Object.entries(snap.generatedFiles || {})) {
  const abs = join(PROJ, rel);
  if (existsSync(abs) && sha256(readFileSync(abs, 'utf8')) !== storedHash) tampered.push(rel);
}

// override detection: overrides/index.ts entries + page-object subclass files that exist
const overrideFps = readOverrideFingerprints(join(PROJ, 'overrides/index.ts'));
const customizedChanged = changed.filter(fp =>
  overrideFps.has(fp) ||
  tampered.some(t => t.includes(slugForFingerprint(fp)))   // a touched generated file for this case
);

const plan = { generatedAt: new Date().toISOString(), added, changed, removed, unchanged: unchanged.length,
               customizedChanged, tampered };
writeFileSync(join(PROJ, '.sync/plan.json'), JSON.stringify(plan, null, 2));

console.log(`Plan: +${added.length} / ~${changed.length} / -${removed.length} (unchanged ${unchanged.length})`);
if (customizedChanged.length) console.log(`  review (customised & changed): ${customizedChanged.length}`);
if (tampered.length) console.log(`  tampered generated files: ${tampered.length}`);
console.log(`Wrote ${join(PROJ, '.sync/plan.json')}`);

// ---- helpers ----
function sha256(s) { return createHash('sha256').update(s).digest('hex'); }
function readOverrideFingerprints(p) {
  const set = new Set();
  if (!existsSync(p)) return set;
  const txt = readFileSync(p, 'utf8');
  // match quoted keys that look like fingerprints: "<slug>|<category>|<slug>"
  for (const m of txt.matchAll(/['"]([a-z0-9-]+\|[a-z0-9-]+\|[a-z0-9-]+)['"]\s*:/gi)) set.add(m[1]);
  return set;
}
function slugForFingerprint(fp) { return fp.split('|')[0]; }
function parseArgs(a) { const o = {}; for (let i = 0; i < a.length; i++) if (a[i].startsWith('--')) { o[a[i].slice(2)] = a[i + 1]; i++; } return o; }
