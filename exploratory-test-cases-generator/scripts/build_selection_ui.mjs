#!/usr/bin/env node
/**
 * Build the self-contained page-selection screen.
 *
 *   node scripts/build_selection_ui.mjs <pages.json> <template.html> <out.html>
 *   node scripts/build_selection_ui.mjs --serve [out.html] [port]   # serve an already-built file
 *
 * Reads pages.json (the Phase-1/2 output), groups the pages, inlines the data into the HTML template
 * (replacing the __QA_DATA__ token), and writes a standalone selection.html with no runtime dependencies.
 * Inlining avoids any file:// fetch/CORS trouble when the page is opened in the Playwright browser.
 *
 * pages.json may be either a bare array of page objects or { pages:[...], roles:[...] }.
 */
import { readFileSync, writeFileSync, createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';

const args = process.argv.slice(2);

if (args[0] === '--serve') {
  const file = resolve(args[1] || 'selection.html');
  const port = Number(args[2] || 8923);
  if (!existsSync(file)) { console.error(`Not found: ${file}`); process.exit(1); }
  createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    createReadStream(file).pipe(res);
  }).listen(port, () => console.log(`Selection UI at http://localhost:${port}/`));
} else {
  const [pagesPath, templatePath, outPath = 'selection.html'] = args;
  if (!pagesPath || !templatePath) {
    console.error('Usage: node build_selection_ui.mjs <pages.json> <template.html> <out.html>');
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(pagesPath, 'utf8'));
  const pages = Array.isArray(raw) ? raw : (raw.pages || []);
  const roles = Array.isArray(raw) ? [] : (raw.roles || []);

  // Group by `group`, preserving first-seen order. The Global synthetic page is pushed to the end.
  const order = [];
  const byGroup = new Map();
  for (const p of pages) {
    const g = p.group || 'Ungrouped';
    if (!byGroup.has(g)) { byGroup.set(g, []); order.push(g); }
    byGroup.get(g).push(p);
  }
  order.sort((a, b) => (a === 'Global' ? 1 : 0) - (b === 'Global' ? 1 : 0));
  const groups = order.map(name => ({ name, pages: byGroup.get(name) }));

  const data = JSON.stringify({ groups, roles });
  const template = readFileSync(templatePath, 'utf8');
  if (!template.includes('__QA_DATA__')) {
    console.error('Template is missing the __QA_DATA__ token.'); process.exit(1);
  }
  writeFileSync(outPath, template.replaceAll('__QA_DATA__', data));
  const total = pages.length;
  console.log(`Wrote ${outPath} — ${groups.length} groups, ${total} pages.`);
  console.log(`Open it in the Playwright browser (file://${resolve(outPath)}),`);
  console.log(`or run: node scripts/build_selection_ui.mjs --serve ${outPath}`);
}
