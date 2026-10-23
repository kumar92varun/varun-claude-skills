#!/usr/bin/env node
/**
 * Scaffold a Playwright + TypeScript project from the bundled template.
 *
 *   node scripts/scaffold.mjs --out <projectDir> --automater-config <path> [--explorer-config <path>]
 *
 * Copies assets/project/** into <projectDir>, replacing a few tokens with values from the configs:
 *   __BASE_URL__, __PRIMARY_ROLE__, __PROJECT_NAME__, __AUTH_CONFIG__
 * Renames gitignore.tpl -> .gitignore and env.example.tpl -> .env.example.
 * Does NOT overwrite files that already exist (so a re-scaffold won't clobber your edits).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve, join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = resolve(HERE, '../assets/project');

const opt = parseArgs(process.argv.slice(2));
if (!opt.out || !opt['automater-config']) {
  console.error('Usage: node scaffold.mjs --out <dir> --automater-config <path> [--explorer-config <path>]');
  process.exit(1);
}
const OUT = resolve(opt.out);
const auto = readJson(opt['automater-config']);
const explorer = opt['explorer-config'] && existsSync(opt['explorer-config']) ? readJson(opt['explorer-config']) : {};

const baseUrl = auto.baseUrl || explorer?.app?.baseUrl || 'http://localhost:3000';
const roles = (explorer?.roles || []).map(r => r.name);
const primaryRole = auto.primaryRole || (explorer?.roles || []).find(r => r.isPrimary)?.name || roles[0] || 'user';
const rolesList = roles.length ? roles : [primaryRole];
const projectName = basename(OUT);

const authConfig = JSON.stringify({
  baseUrl,
  storageStateDir: auto?.auth?.storageStateDir || './.auth',
  roleProfiles: auto?.auth?.roleProfiles || {},
  roles: rolesList,
}, null, 2);

const tokens = {
  __BASE_URL__: baseUrl,
  __PRIMARY_ROLE__: primaryRole,
  __PROJECT_NAME__: projectName,
  __AUTH_CONFIG__: authConfig,
};

let created = 0, skipped = 0;
walk(TEMPLATE, (abs, rel) => {
  let target = join(OUT, rel);
  if (rel.endsWith('gitignore.tpl')) target = join(OUT, dirname(rel), '.gitignore');
  if (rel.endsWith('env.example.tpl')) target = join(OUT, dirname(rel), '.env.example');
  if (basename(rel) === '.gitkeep') { ensureDir(dirname(target)); if (!existsSync(target)) writeFileSync(target, ''); return; }

  if (existsSync(target)) { skipped++; return; }      // never clobber existing files
  ensureDir(dirname(target));
  let content = readFileSync(abs, 'utf8');
  for (const [k, v] of Object.entries(tokens)) content = content.replaceAll(k, v);
  writeFileSync(target, content);
  created++;
});

// write .sync/ dir + an empty snapshot so first sync has a baseline of "nothing"
ensureDir(join(OUT, '.sync'));
if (!existsSync(join(OUT, '.sync/last.json')))
  writeFileSync(join(OUT, '.sync/last.json'),
    JSON.stringify({ snapshotAt: null, cases: {}, generatedFiles: {} }, null, 2));

console.log(`Scaffolded ${projectName}: ${created} file(s) written, ${skipped} kept.`);
console.log(`Base URL: ${baseUrl} · primary role: ${primaryRole} · roles: ${rolesList.join(', ')}`);
console.log(`Next: cd ${OUT} && npm install && npx playwright install`);

// ---- helpers ----
function walk(dir, cb, rootLen = TEMPLATE.length + 1) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) walk(abs, cb, rootLen);
    else cb(abs, abs.slice(rootLen));
  }
}
function ensureDir(d) { if (!existsSync(d)) mkdirSync(d, { recursive: true }); }
function readJson(p) { return JSON.parse(readFileSync(resolve(p), 'utf8')); }
function parseArgs(a) { const o = {}; for (let i = 0; i < a.length; i += 2) if (a[i]?.startsWith('--')) o[a[i].slice(2)] = a[i + 1]; return o; }
