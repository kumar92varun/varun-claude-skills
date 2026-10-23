import type { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/** Run an axe-core scan (WCAG 2.1/2.2 AA) and return violations. Throws clearly if injection is blocked. */
export async function scanA11y(page: Page, opts?: { include?: string; rules?: string[] }) {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']);
  if (opts?.include) builder = builder.include(opts.include);
  try {
    const { violations } = await builder.analyze();
    return opts?.rules ? violations.filter(v => opts.rules!.includes(v.id)) : violations;
  } catch (e: any) {
    throw new Error(`axe-core could not run (CSP may block injection): ${e?.message ?? e}`);
  }
}

export function formatViolations(violations: any[]): string {
  if (!violations.length) return 'no accessibility violations';
  return violations.map(v => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help}`).join('\n');
}
