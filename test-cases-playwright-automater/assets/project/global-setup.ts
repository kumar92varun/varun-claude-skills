import { chromium, type FullConfig } from '@playwright/test';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import 'dotenv/config';

/**
 * Prepares a storageState file per configured role, reusing the explorer's sessions where possible so you
 * don't log in again. Order per role: fresh ./.auth/<role>.json → explorer profile dir → .env login → skip.
 * Scaffolded once; edit the .env login flow to match your app's login form.
 *
 * Config is injected at scaffold time as __AUTH_CONFIG__ (primaryRole, roleProfiles, storageStateDir, baseUrl).
 */
const CFG = __AUTH_CONFIG__ as {
  baseUrl: string;
  storageStateDir: string;
  roleProfiles: Record<string, string>;
  roles: string[];
};

const FRESH_MS = 1000 * 60 * 60 * 12; // reuse a saved session for 12h before refreshing

export default async function globalSetup(_config: FullConfig) {
  const authDir = resolve(CFG.storageStateDir);
  mkdirSync(authDir, { recursive: true });

  for (const role of CFG.roles) {
    const out = resolve(authDir, `${role}.json`);
    if (existsSync(out) && Date.now() - statSync(out).mtimeMs < FRESH_MS) continue; // 1. fresh

    const profile = CFG.roleProfiles?.[role];
    if (profile && existsSync(resolve(profile))) {                                   // 2. reuse profile
      const ctx = await chromium.launchPersistentContext(resolve(profile), { headless: true });
      await ctx.storageState({ path: out });
      await ctx.close();
      continue;
    }

    const user = process.env[`E2E_${role.toUpperCase()}_USER`];                      // 3. .env login
    const pass = process.env[`E2E_${role.toUpperCase()}_PASS`];
    if (user && pass) {
      const browser = await chromium.launch();
      const page = await browser.newPage({ baseURL: CFG.baseUrl });
      // TODO: adjust selectors to your login form.
      await page.goto('/login');
      await page.getByLabel(/email/i).fill(user);
      await page.getByLabel(/password/i).fill(pass);
      await page.getByRole('button', { name: /sign in|log in/i }).click();
      await page.waitForLoadState('networkidle');
      await page.context().storageState({ path: out });
      await browser.close();
      continue;
    }
    // 4. no session for this role — cross-role/auth tests that need it will test.skip with a reason.
    console.warn(`global-setup: no session prepared for role "${role}" (no profile, no .env creds).`);
  }
}
