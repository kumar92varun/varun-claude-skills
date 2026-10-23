# Step → Code Mapping

How one JSON test case becomes one Playwright test. The goal is a spec that reads like the case and fails
honestly — generating a test that can't fail, or one whose assertion is weaker than the case's intent, is
worse than no test.

## The skeleton

Each case becomes one `test(...)`. The title starts with the case `id` so sync can find it; the `fingerprint`
goes in a comment on the line above; `category` and `priority` become tags.

```ts
// fingerprint: orders-detail|negative|wrong-status
test('TC-ORDERS-DETAIL-NEG-003: wrong status value shows generic error',
  { tag: ['@negative', '@P1'] }, async ({ page, asRole }) => {
    // override hook: if overrides/ has this fingerprint, the generated spec delegates to it (see below)
    const p = new OrdersDetailPage(page);
    ...
});
```

If `roles` names a non-primary role, switch context via the `asRole` fixture at the top. If `requiresManual`
is true, emit `test.skip(...)` with the steps as comments and add the case to `manual-checklist.md`.

## Steps → calls

Map each `steps[]` entry by its `action`. Wrap each in `test.step(step.text, ...)` so the human-readable text
shows up in the trace.

| `action` | Playwright |
|---|---|
| `navigate` | `await p.goto(input)` (page object owns the path) |
| `click` | `await <locator>.click()` |
| `fill` | `await <locator>.fill(resolve(input))` |
| `select` | `await <locator>.selectOption(resolve(input))` |
| `hover` | `await <locator>.hover()` |
| `press` | `await <locator>.press(input)` |
| `upload` | `await <locator>.setInputFiles(resolve(input))` |
| `wait` | prefer a real condition — `await page.waitForResponse(...)` / `expect(...).toBeVisible()` — over a bare timeout |
| `reload` / `back` | `await page.reload()` / `await page.goBack()` |
| `resize` | `await page.setViewportSize(...)` |
| `assert` | an `expect` built from `expected` (see below) |

`resolve(x)` expands templates: `{{testData.email}}` from the case's `testData`, `{{shared.users.admin}}` from
the JSON's `sharedTestData` (exposed through the data fixture). Never inline a secret — pull it from the
fixture/`.env`.

## Locators → page object (validate, flag, never silently fix)

Locators live on the generated page object, never inline in the spec, so one locator change touches one place.
Build each from the JSON `locator` by strategy priority: `testid` → `getByTestId`, `role` → `getByRole`,
`label` → `getByLabel`, `text` → `getByText`, `css` → `locator`. Keep the `fallback` as a comment.

```ts
get errorBanner() { return this.page.getByRole('alert'); }          // fallback: '.error'
openStatusDropdown() { return this.page.getByTestId('status-select').click(); }
```

- A case whose `locator.confidence` (or the case `confidence`) is `low` gets a `// FIXME locator` on that
  member.
- During Phase 3, if live validation shows a locator doesn't resolve, add `// FIXME locator: not found on
  <url>` and list it in the report. Do **not** guess a replacement — a missing selector is either a real page
  change (a finding) or a bad capture, and a human decides which.

## Assertions (the part that must stay honest)

Build assertions from, in order of reliability: each step's `expected`, then the case `expectedResult`.

- A concrete expectation → a real `expect`. `"Generic error shown"` + an error locator →
  `await expect(p.errorBanner).toBeVisible()`. `"stays on /login"` → `await expect(page).toHaveURL(/\/login/)`.
  Quoted UI text → `toHaveText`/`toContainText` with that text.
- Vague prose that can't be turned into a reliable check → **do not invent one and do not skip it silently**.
  Emit a failing marker so it's impossible to miss:
  ```ts
  // TODO assert: "the row is not left partially updated" — expectedResult was prose; verify + implement
  expect(false, 'TODO: assert row not partially updated').toBe(true);
  ```
  A deliberately failing TODO is honest (the suite tells you coverage is incomplete); a missing assertion is a
  silent lie. Every TODO is listed in `sync-report.md`.
- Never assert current observed behaviour when the case flags it as a bug. If `basis` is `observed` but a
  linked finding says the behaviour is wrong, assert the *intended* `expectedResult` (the test will fail,
  correctly, until the bug is fixed).

## Flakiness → waits and retries (P1)

Use the case's `flakiness` annotation:
- Turn each `stabilization` hint into a concrete wait at the right point — most often
  `await page.waitForResponse('**/api/...')` before the assertion, or `expect(...).toBeVisible()` instead of a
  timeout.
- Set retries by `risk`: group `high`/`medium`-risk tests under `test.describe.configure({ retries })`
  (values from `automater.config.json → run.retries`); leave `low` at the project default. Per-test retries
  aren't a first-class Playwright feature, so grouping by a describe is the clean way to vary them.

## The override delegation hook

So a human can fully replace a generated body without the sync fighting them, each generated spec checks the
override registry first:

```ts
import { overrides } from '../overrides';
const fp = 'orders-detail|negative|wrong-status';
if (overrides[fp]) { overrides[fp]({ page, asRole, data }); }
else { /* ...generated body... */ }
```

`overrides/index.ts` starts empty (`export const overrides = {}`). The generator never writes into it — it's
yours.
