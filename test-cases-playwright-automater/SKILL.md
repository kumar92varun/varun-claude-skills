---
name: test-cases-playwright-automater
description: >-
  Turn a test-cases JSON file (the output of the exploratory-test-cases-generator) into a runnable Playwright
  + TypeScript test suite, and keep that suite in sync when the JSON later changes. Use this whenever the user
  wants to generate Playwright automation from test cases, "build the automated tests from the JSON", scaffold
  an e2e suite from test cases, or re-sync an existing generated suite after editing the test-cases file
  (adding, modifying or removing cases). It scaffolds a Page-Object-Model project, generates one spec per page
  plus journeys and a shared-chrome suite, validates locators against the live app, runs the suite and reports
  every failure (it never auto-fixes, so real bugs stay visible), and on later runs diffs the new JSON against
  a saved snapshot and opens a PR with the added/changed/removed tests. Trigger it even when the user just says
  "now automate these test cases with Playwright" without naming this skill.
---

# Test Cases → Playwright Automater

## What this skill does

You take a `test-cases.json` (the exploratory-test-cases-generator's output) and produce a **runnable
Playwright + TypeScript suite** that mirrors those cases. On the first run you scaffold the project and
generate everything. On every later run you *reconcile* the suite with a possibly-edited JSON — add new
tests, regenerate changed ones, delete removed ones — and open a PR so a human reviews the delta.

Two principles run through the whole skill:

- **The JSON is the source of truth; the generated code is a build artifact.** Nobody hand-edits generated
  files. All human customization (a tricky selector, a complex assertion, a bespoke test body) lives in the
  non-generated seams — `pages/<Name>Page.ts` subclasses, `overrides/`, and `helpers/`. This is what lets a
  re-sync regenerate freely without destroying anyone's work. See `references/project-layout.md`.
- **Never make a failing test pass by weakening it.** This skill *generates and runs* tests; it does **not**
  auto-fix them. A test that fails on an assertion may have caught a real bug, so it is left red, tagged
  `@needs-triage`, and reported as a candidate finding — never "repaired" by loosening or deleting the
  assertion. Only locator/selector problems are *flagged* (FIXME), not silently patched.

## Inputs

- `test-cases.json` — required. The contract it follows is the explorer's `references/json-contract.md`;
  re-read that if you're unsure what a field means. Key fields this skill leans on: `fingerprint` (stable
  identity for mapping a case to its generated test), `steps[]` (action/target/locator/input/expected),
  `expectedResult`, `category`, `priority`, `roles`, `flakiness`, `requiresManual`, `pageId`/`pageIds`.
- The explorer's `exploratory-tests.config.json` if present — reused for base URL, roles and the non-prod
  allowlist, so the two skills share one setup. Don't re-ask for what it already holds.
- This skill's own `automater.config.json` (created on first run) — where the generated suite lives, the
  primary role, storageState/profile paths, and run options. See `config.example.json`.

## The run

Set up a task list; announce what you're doing in a line, then proceed. The only human gate is reviewing the
PR at the end — generation itself doesn't need step-by-step approval.

### Phase 0 — Load inputs and decide first-run vs sync

Read `test-cases.json` and the two configs. If the target project directory doesn't exist yet, this is a
**first run** (scaffold + full generate). If it exists and has a `.sync/last.json`, this is a **sync run**
(diff + reconcile). On first run, if `automater.config.json` is missing, ask the short interview in
`references/project-layout.md` and write it.

### Phase 1 — Scaffold (first run only)

Run `node scripts/scaffold.mjs --out <projectDir> --explorer-config <path> --automater-config <path>`. It
writes the static skeleton — `playwright.config.ts`, `global-setup.ts`, `fixtures/`, `helpers/` (axe, timing,
security), `overrides/index.ts`, `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`, and the CI
workflow — parameterised with the base URL, primary role and role list. Then `npm install` and
`npx playwright install` in the project. The scaffold is the part you should never rewrite by hand each run;
let the script own it. Details in `references/project-layout.md`.

### Phase 2 — Generate / reconcile specs and page objects

**First run:** generate for every case. **Sync run:** run `node scripts/sync_plan.mjs <test-cases.json>
--project <projectDir>` first; it diffs the JSON against `.sync/last.json`, hashes the current generated
files to catch any direct edits, and writes `.sync/plan.json` with `added`, `changed`, `removed`,
`customizedChanged` (changed cases that have an override — flag, don't clobber) and `tampered`. Then apply the
plan:

- For each **page** with selected cases, write `pages/generated/<Name>Page.ts` (locators + basic actions) and,
  only if it doesn't already exist, the thin `pages/<Name>Page.ts` subclass the user owns.
- For each **case**, emit its test into the page's spec (or `journeys/` for `e2e-journey`, `global.spec.ts`
  for `PG-GLOBAL`), following `references/step-mapping.md` for how step actions become Playwright calls, how
  assertions are built, and how `flakiness` becomes waits + retries. Category-specific shapes (axe for
  accessibility, timing for performance, route interception for network-failure, inline cross-role contexts
  for security, viewports for responsive) are in `references/category-patterns.md`.
- **Removed** cases: delete their test; if a page object is now unused, prune it (`git` shows the deletion in
  the PR).
- **customizedChanged** and **tampered**: regenerate the artifact but leave the user's override in place, and
  add the case to the PR's review list — these are the only ones a human must look at closely.

Deterministic naming is what makes sync work: the test title begins with the case `id`, and a comment carries
its `fingerprint`, so a case always maps to exactly one test across runs.

### Phase 3 — Validate locators against the live app (flag, don't fix)

If the app is reachable (base URL up, a role session available), open it and check that each generated
locator resolves. Where one doesn't, leave a `// FIXME locator: <reason>` on that line and list it in the
report. Do **not** rewrite the locator — a broken selector might mean the page changed (a real finding) or a
low-confidence capture; either way a human decides. If the app isn't reachable, skip this phase and say so.

### Phase 4 — Run the suite and collect results (no auto-fix)

If the app is reachable, run the tests (`npx playwright test`, or just the affected specs on a sync run).
Collect pass/fail and the HTML report. For every failure, classify it for the report only:

- **Assertion failure** — the app behaved differently from `expectedResult`. Tag the test `@needs-triage` and
  record a **candidate finding** (likely a real bug). Never touch the assertion.
- **Infrastructure failure** — selector didn't resolve, timeout, missing session/context. Tag
  `@needs-triage`, note the probable cause in the report. Still don't edit the test to force green.

If the app isn't reachable, skip the run and note that the suite is generated but unverified.

### Phase 5 — Finalise: snapshot, report, PR

Run `node scripts/sync_finalize.mjs <test-cases.json> --project <projectDir>`. It rewrites `.sync/last.json`
(the new JSON snapshot plus fresh hashes of every generated file) and writes `sync-report.md` from the plan
and any run results. Then:

- **First run:** scaffold the project locally, print the `gh repo create` / `git remote add` steps for the
  user to run (this skill does not create the remote itself), and summarise what was generated.
- **Sync run:** create a branch, commit the regenerated/deleted files, and open a PR titled
  `Sync: +<added> / ~<changed> / −<removed> tests`, with `sync-report.md` as the body — including the review
  list (customizedChanged/tampered), FIXME locators, TODO assertions, and candidate findings.

## Safety rules (always on)

- **Never weaken or delete an assertion to make a test pass.** Reds stay red and get reported.
- **Production guard** carries over from the explorer config: the generated suite's base URL and any
  mutating setup must target a non-prod allowlisted host. Refuse to point a destructive run at production.
- **`requiresManual` cases** (OTP/payment/destructive) are generated as `test.skip` with their steps as
  comments and listed in `manual-checklist.md` — never driven automatically.
- **Credentials** live only in `.env` (gitignored) or reused `storageState`; never written into generated
  code, specs, or the report.
- **Generated files are artifacts** — if a sync detects one was hand-edited, it flags it for review rather
  than silently overwriting the person's change.

## Reference files

| File | Read it when | Holds |
|---|---|---|
| `references/project-layout.md` | Phase 0/1 | the scaffold, config interview, auth/storageState bridging, the override seams |
| `references/step-mapping.md` | generating a case | JSON step → Playwright call, assertion building, locators/FIXME, flakiness → waits/retries |
| `references/category-patterns.md` | generating a case | how each of the 13 categories becomes a test |
| `references/sync-and-diff.md` | sync runs | the snapshot diff, tamper/override detection, deletion/prune, PR + report shape |
