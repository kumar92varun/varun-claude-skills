# Category Patterns

All 13 categories are generated as runnable tests. Most are ordinary interaction tests built per
`step-mapping.md`; the ones below need a specific Playwright shape. Keep the honesty rule throughout — a
category test that can't actually fail is worse than none.

## functional, ui, negative, boundary, state-navigation, usability

Plain interaction tests from the steps. `state-navigation` uses `page.reload()`, `goBack()/goForward()`,
`context.newPage()` for a second tab, and deep-link navigation. `ui` leans on `toHaveText`, `toBeVisible`,
`toHaveCount`, `toHaveScreenshot` only where the case explicitly calls for a visual check.

## e2e-journey

Lives in `journeys/<slug>.journey.spec.ts`. Walks the `pageIds` in order, instantiating each page object in
turn, carrying data between steps (an id created on page 1 used on page 3). Keep each journey one `test` with
`test.step` per leg so a failure points at the leg.

## accessibility — `@axe-core/playwright`

```ts
import { scanA11y } from '../helpers/axe';
const violations = await scanA11y(page);           // runs AxeBuilder, returns violations
expect(violations, formatViolations(violations)).toEqual([]);
```
The case's `subcategory` narrows the rule set when given. If the app's CSP blocks axe injection, `scanA11y`
throws a clear message; the test fails as infra (flagged), not silently passes.

## performance — `helpers/timing.ts`

Capture navigation timing / LCP and assert against the baseline recorded on the case (from the explorer's
measured run). Keep thresholds generous unless the case specifies one, since CI hardware varies:
```ts
const { lcp } = await capturePerf(page, '/orders');
expect(lcp, `LCP ${lcp}ms`).toBeLessThan(case_.budgetMs ?? 4000);
```

## responsive — inline viewports (no extra projects, per N3)

Set the viewport in the test from `automater.config.json → viewport`, run the page's core checks at mobile
width, assert no horizontal scroll and that key controls remain reachable:
```ts
await page.setViewportSize({ width: 390, height: 844 });
await expect(page.locator('body')).toHaveJSProperty('scrollWidth', /* <= */ await viewportWidth(page));
```

## network-failure — `page.route`

Intercept the relevant endpoint and force the failure the case describes, then assert graceful degradation (a
real error state, a retry, no infinite spinner, no silent data loss):
```ts
await page.route('**/api/orders**', r => r.fulfill({ status: 500, body: '{}' }));
await page.goto('/orders');
await expect(page.getByRole('alert')).toContainText(/try again/i);
```
Offline and slow-network variants use `context.setOffline(true)` and CDP throttling where available; where the
runtime can't express it, emit the test `test.skip` with the reason (don't fake it).

## security — passive checks run inline; cross-role via extra contexts (E1)

Passive checks need no extra context — read them from the main response:
```ts
import { assertSecurityHeaders, assertCookieFlags } from '../helpers/security';
const resp = await page.goto('/');
assertSecurityHeaders(resp);                 // CSP, HSTS, X-Frame-Options, X-Content-Type-Options
await assertCookieFlags(context);            // HttpOnly, Secure, SameSite on session cookies
```

Output-escaping: enter the harmless marker from the case and assert it is **not** rendered as HTML.

Access-control / IDOR / privilege-escalation need a different session than the primary project. Build the
context inline, and skip cleanly when the needed session isn't available (keeps N3's single-project default):
```ts
import { contextForRole, anonContext } from '../helpers/security';
const anon = await anonContext(browser);                  // no storageState
test.skip(!anon, 'no unauthenticated context available');
const res = await anon.request.get('/admin');
expect(res.status(), 'protected route reachable without auth').toBe(302);

const member = await contextForRole(browser, 'member');   // loads ./.auth/member.json if present
test.skip(!member, 'member session not prepared');
// ...attempt an admin-only route / another tenant's record id, expect a block...
```
A route that leaks is an **assertion failure** → candidate finding, left red. Injection payloads meant to
execute and rate-limit/brute-force probes are **not** run here — generate them `test.skip` with a note, per
the explorer's security policy.

## flakiness

Two outputs, matching how the explorer wrote them: (1) the dedicated stress tests (rapid double-click,
submit-before-load, debounce) as normal tests with the race deliberately triggered; (2) the per-test
`flakiness` annotation applied everywhere as waits + retries (see `step-mapping.md`). Don't let a stress test
become silently flaky itself — give it the stabilisation it needs to fail *only* when the real race is
present.
