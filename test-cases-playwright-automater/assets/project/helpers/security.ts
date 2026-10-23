import { expect, type APIResponse, type Browser, type BrowserContext } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Passive security-header check on a document response. Soft by default — asserts presence, not policy depth. */
export function assertSecurityHeaders(resp: APIResponse | null) {
  expect(resp, 'no response to inspect').not.toBeNull();
  const h = resp!.headers();
  expect(h['content-type'], 'missing content-type').toBeTruthy();
  // These are reported as failures when absent; tune per app if a header is intentionally omitted.
  expect(h['x-content-type-options'], 'missing X-Content-Type-Options').toBeTruthy();
  expect(
    h['content-security-policy'] || h['x-frame-options'],
    'missing both CSP and X-Frame-Options (clickjacking exposure)'
  ).toBeTruthy();
}

export async function assertCookieFlags(context: BrowserContext) {
  const cookies = await context.cookies();
  const session = cookies.filter(c => /sess|sid|token|auth/i.test(c.name));
  for (const c of session) {
    expect(c.httpOnly, `cookie ${c.name} missing HttpOnly`).toBeTruthy();
    expect(c.secure, `cookie ${c.name} missing Secure`).toBeTruthy();
    expect(['Strict', 'Lax'], `cookie ${c.name} weak SameSite`).toContain(c.sameSite);
  }
}

/** A fresh context with NO storageState — for "protected route reachable while logged out" checks. */
export async function anonContext(browser: Browser): Promise<BrowserContext | null> {
  return browser.newContext(); // never null, but kept nullable to mirror contextForRole's signature
}

/** A context signed in as another role, or null if that session wasn't prepared by global-setup. */
export async function contextForRole(browser: Browser, role: string): Promise<BrowserContext | null> {
  const state = resolve(process.cwd(), `.auth/${role}.json`);
  if (!existsSync(state)) return null;
  return browser.newContext({ storageState: state });
}
