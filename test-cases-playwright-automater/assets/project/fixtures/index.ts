import { test as base, expect, type Browser, type BrowserContext } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Extends Playwright's `test` with:
 *  - `data`: the JSON's sharedTestData, for resolving {{shared.*}} templates.
 *  - `asRole(role)`: a context/page signed in as another role (loads ./.auth/<role>.json), for the few
 *    cross-role tests. Returns null when that session wasn't prepared, so a test can skip cleanly.
 * Scaffolded once; safe to extend.
 */
type SharedData = Record<string, any>;

function loadShared(): SharedData {
  const p = resolve(__dirname, '../fixtures/shared-data.json');
  try { return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {}; } catch { return {}; }
}

export const test = base.extend<{
  data: SharedData;
  asRole: (role: string) => Promise<{ context: BrowserContext; } | null>;
}>({
  data: async ({}, use) => { await use(loadShared()); },
  asRole: async ({ browser }, use) => {
    const opened: BrowserContext[] = [];
    const fn = async (role: string) => {
      const state = resolve(process.cwd(), `.auth/${role}.json`);
      if (!existsSync(state)) return null;
      const context = await (browser as Browser).newContext({ storageState: state });
      opened.push(context);
      return { context };
    };
    await use(fn);
    for (const c of opened) await c.close();
  },
});

export { expect };
