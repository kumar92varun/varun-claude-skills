# JSON Contract

This is the single source of truth for the shape of `test-cases.json`. **A separate skill reads this file to
push cases into Jira / Notion / Confluence / Google Sheets.** Treat it like a public API: fields may be added,
but names and meanings must not drift, because any drift silently breaks the downstream push. There is
deliberately no standalone JSON Schema file — this document *is* the schema, and `scripts/merge_and_validate.mjs`
enforces the required-field and enum rules below.

Design rules the shape follows:

- **Flat `testCases[]`.** One test case is one record everywhere downstream — a Jira issue, a Notion row, a
  Sheet row — so the cases live in a single flat array rather than nested under groups and pages. Group and
  page are fields *on* each case. `meta`, `pages`, `sharedTestData` and `coverage` are separate top-level
  sections.
- **Journeys ride along.** End-to-end journeys are just test cases with `category: "e2e-journey"` and a
  populated `pageIds`. No separate `journeys[]` array — one array means one push pipeline.
- **Plain text in fields, lists as arrays.** No Markdown, no HTML inside string fields. The push skill renders
  plain strings into each tool's own format (Jira rich text, Notion blocks, Sheet cells). Keep steps and
  expectations as plain prose and arrays.
- **Locators stay.** Even though this skill does not generate executable specs, each step keeps a `locator`,
  because the AI-agent consumer downstream needs them and they are nearly free to capture during exploration.
- **`sync` is reserved for the push skill.** This skill writes `sync: {}` and never anything else into it. The
  push skill writes back the downstream IDs (`{"jira": {"key": "QA-123", "pushedAt": "..."}}`), and on a
  re-run this skill *preserves* whatever is in `sync` so updates go to the same records instead of creating
  duplicates.

## Top-level file structure

```json
{
  "meta": { ... },
  "pages": [ { ...page... } ],
  "sharedTestData": { ... },
  "testCases": [ { ...test case... } ],
  "coverage": { ... }
}
```

## `meta`

```json
{
  "schemaVersion": "1.0.0",
  "generatedAt": "2026-10-23T09:12:00Z",
  "generator": "exploratory-test-cases-generator",
  "app": { "name": "Acme Admin", "baseUrl": "https://staging.acme.test" },
  "environment": { "name": "staging", "isProduction": false, "mutationMode": "safe" },
  "rolesExplored": ["admin", "member", "guest"],
  "primaryRole": "admin",
  "run": { "id": "run-2026-10-23-01", "previousRunId": "run-2026-10-22-02" }
}
```

## `pages[]`

Produced in Phase 1, refined in Phase 2, selection written back in Phase 3.

```json
{
  "id": "PG-ORDERS-DETAIL",
  "group": "Orders",
  "url": "/orders/1024",
  "routeTemplate": "/orders/:id",
  "title": "Order detail",
  "visibleToRoles": ["admin", "member"],
  "discoveredBy": ["code", "crawl"],
  "complexity": { "forms": 1, "tables": 2, "modals": 3, "interactiveControls": 24 },
  "include": true,
  "explored": true,
  "notes": "Has an inline edit modal and a status-change dropdown"
}
```

`PG-GLOBAL` is the synthetic page that owns the shared-chrome suite; its `group` is `"Global"`.

## `testCases[]` — the core record

Every field below. Required fields are marked **(req)**; the validator rejects a case missing one or using an
illegal enum value.

| Field | Type | Notes |
|---|---|---|
| `id` **(req)** | string | Deterministic: `TC-<GROUP>-<PAGE>-<CAT>-<NNN>`, e.g. `TC-AUTH-LOGIN-NEG-003`. Stable across runs. |
| `fingerprint` **(req)** | string | Stable identity independent of numbering: `"<page-slug>\|<category>\|<short-intent-slug>"`. Used to match a case across runs so `sync` IDs survive. |
| `title` **(req)** | string | One-line, action-first. "Login with wrong password shows generic error". |
| `description` | string | One or two sentences on what is verified. |
| `rationale` | string | Why this test matters / what risk it covers. |
| `group` **(req)** | string | The page's domain group. |
| `pageId` **(req)** | string | The owning page's id (`PG-GLOBAL` for shared chrome). |
| `pageIds` | string[] | For `e2e-journey` cases, the pages the journey spans. Empty otherwise. |
| `url` | string | The page path the case starts on. |
| `routeTemplate` | string | The template form of `url`. |
| `component` | string | The specific UI element/area under test ("Login form", "Orders table"). |
| `category` **(req)** | enum | One of the categories listed below. |
| `subcategory` | string | Free text narrowing ("invalid-credentials", "empty-state"). |
| `tags` | string[] | Free labels: `smoke`, `regression`, `auth`, `rbac`, etc. |
| `priority` **(req)** | enum | `P0` \| `P1` \| `P2` \| `P3`. |
| `severity` **(req)** | enum | `Critical` \| `Major` \| `Minor` \| `Trivial`. |
| `roles` | string[] | Roles the case applies to (`["guest"]`, `["admin"]`). |
| `preconditions` | string[] | What must be true before step 1. |
| `testData` | object | Inline data for this case. May reference shared data as `{{shared.users.admin}}`. |
| `steps` **(req)** | Step[] | Ordered steps; shape below. |
| `expectedResult` **(req)** | string | The **intended** end state. If observed behaviour looks wrong, state the intended behaviour here and raise a finding — do not encode the bug. |
| `observedBehavior` | string | What the app actually did. "Matches expected" when it agrees. |
| `postconditions` | string[] | State left behind; cleanup notes. |
| `gherkin` | string \| null | Given/When/Then text. `null` unless the config's `gherkin` flag is on. |
| `basis` **(req)** | enum | `observed` (seen during exploration) \| `inferred` (reasoned, not observed). |
| `confidence` **(req)** | enum | `high` \| `medium` \| `low`. |
| `flakiness` | object | `{ "risk": "low\|medium\|high", "causes": [..], "stabilization": ".." }`. |
| `automation` | object | `{ "feasibility": "high\|medium\|low", "notes": ".." }`. |
| `estimatedMinutes` | number | Rough manual-execution time. |
| `requiresManual` | boolean | True for OTP/email/payment/destructive flows written up but not driven. |
| `dependsOn` | string[] | Other test `id`s that must pass first. |
| `environment` | object | `{ "browser": "chromium", "viewport": "1440x900" }`. |
| `evidence` | string[] | Relative paths into `evidence/`. |
| `relatedFindings` | string[] | `findings.json` ids this case relates to. |
| `requirementIds` | string[] | Reserved for a future requirements-linked mode; empty now. |
| `status` **(req)** | enum | `draft` \| `added` \| `changed` \| `obsolete`. First run writes `draft`; re-runs set the diff status. |
| `sync` **(req)** | object | `{}` from this skill. The push skill owns the contents. Preserved across re-runs. |

### Step shape

```json
{
  "step": 1,
  "action": "fill",
  "target": "Email field",
  "locator": { "strategy": "label", "value": "Email", "fallback": "#email" },
  "input": "{{testData.email}}",
  "expected": "Field accepts the value",
  "text": "Enter the registered email address"
}
```

- `action` is a verb: `navigate`, `click`, `fill`, `select`, `hover`, `press`, `upload`, `wait`, `assert`,
  `reload`, `back`, `resize`, `setNetwork`.
- `locator.strategy` priority, best first: `testid` → `role` → `label` → `text` → `css`. Always capture a
  `fallback` when the primary isn't a `testid`. A page with no test ids at all should also yield a
  testability finding (see `security-and-nfr.md`).
- `text` is the human-readable rendering of the step — what a manual tester reads.
- `input` and `expected` may be `null` when not applicable to that step.

### Allowed `category` values

`functional`, `ui`, `negative`, `boundary`, `flakiness`, `accessibility`, `security`, `performance`,
`responsive`, `state-navigation`, `usability`, `network-failure`, `e2e-journey`.

(Localization/i18n is intentionally excluded unless the user turns it on in config.)

## `sharedTestData`

Reusable entities referenced from cases as `{{shared.*}}`, so a user or product id is defined once.

```json
{
  "users": {
    "admin": { "email": "qa_auto_admin@example.test", "role": "admin" },
    "member": { "email": "qa_auto_member@example.test", "role": "member" }
  },
  "products": { "sample": { "sku": "QA_AUTO_SKU_1" } }
}
```

## `coverage`

Written by the merge script; a quick machine-readable summary mirrored in `coverage.md`.

```json
{
  "totals": { "testCases": 412, "findings": 7, "pagesSelected": 23, "pagesExplored": 23 },
  "byCategory": { "functional": 96, "negative": 71, "accessibility": 38, "...": 0 },
  "byPriority": { "P0": 18, "P1": 120, "P2": 190, "P3": 84 },
  "byGroup": { "Authentication": 24, "Orders": 88, "...": 0 },
  "gaps": { "pagesWithNoTests": [], "casesWithNoAssertions": [], "categoriesEmpty": ["localization"] }
}
```

## `findings.json` (separate file)

Real defects spotted while exploring — not test cases. Same push skill can route these to bug tickets.

```json
{
  "generatedAt": "2026-10-23T09:12:00Z",
  "findings": [
    {
      "id": "FND-ORDERS-001",
      "pageId": "PG-ORDERS-DETAIL",
      "type": "console-error | broken-link | http-5xx | a11y-violation | missing-testids | slow-page | security-header | other",
      "severity": "Critical | Major | Minor | Trivial",
      "title": "Status dropdown throws on empty selection",
      "detail": "Selecting the blank option logs an uncaught TypeError and the row stops updating.",
      "repro": ["Open /orders/:id", "Open the Status dropdown", "Choose the blank option"],
      "evidence": ["evidence/PG-ORDERS-DETAIL/status-error.png"],
      "relatedTests": ["TC-ORDERS-DETAIL-NEG-004"]
    }
  ],
  "qaAutoDataCreated": [
    { "pageId": "PG-ORDERS-NEW", "label": "QA_AUTO_1729671120_order", "where": "Orders list", "cleanup": "manual" }
  ]
}
```
