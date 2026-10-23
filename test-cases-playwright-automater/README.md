# test-cases-playwright-automater

A Claude skill that turns a `test-cases.json` (the output of **exploratory-test-cases-generator**) into a
runnable Playwright + TypeScript suite, and keeps that suite in sync when the JSON changes later — adding,
regenerating and removing tests, and opening a PR with the delta.

It is the third skill in the QA chain:

```
exploratory-test-cases-generator  →  test-cases.json  →  test-cases-playwright-automater  →  Playwright suite
                                               └──────→  (push skill) → Jira / Notion / Sheets
```

## Install (personal skill)

```bash
cp -r test-cases-playwright-automater ~/.claude/skills/
```

## Prerequisites

- **Claude Code engine** (CLI or the desktop Code tab) — needs a shell.
- **Node 18+** and the ability to run `npm install` / `npx playwright install` in the generated project.
- A `test-cases.json` from the explorer, and ideally its `exploratory-tests.config.json` (reused for base
  URL, roles and the non-prod allowlist).

## Use

Ask, e.g. *"now automate these test cases with Playwright"* or *"re-sync the e2e suite, I edited the JSON"*, or
run it as a slash command. On the first run it scaffolds a dedicated Playwright project and generates a test
for every case. On later runs it diffs the new JSON against a saved snapshot and opens a PR with what changed.

What it does, in order: load inputs → scaffold (first run) → generate/reconcile specs + page objects →
validate locators against the live app (flag, don't fix) → run the suite → write `sync-report.md` and open a
PR. Design decisions baked in:

- **JSON is the source of truth.** Generated files are artifacts; your customisations live in
  `pages/<Name>Page.ts`, `overrides/` and `helpers/`, so a re-sync never destroys your work. A changed case
  that you've customised (or a generated file you edited directly) is flagged for review, never clobbered.
- **No auto-fix.** The suite is generated and run, but failing tests are never "repaired" by weakening
  assertions — an assertion failure is reported as a candidate real bug and left red. Only locator problems
  are flagged (FIXME), not patched.
- **Honest assertions.** Vague prose that can't become a reliable check becomes a failing `// TODO assert`
  rather than a silently missing one.
- **Reuses the explorer's logins.** `global-setup` bridges the explorer's per-role browser profiles to
  Playwright `storageState`, so you don't log in again; `.env` is the fallback.

## Scope

All 13 categories are generated as runnable tests. Accessibility uses `@axe-core/playwright`, performance uses
navigation timing/LCP, network-failure uses `page.route`, responsive uses inline viewports, and cross-role /
unauthenticated security tests build contexts inline (skipping cleanly when a role session isn't available).
`requiresManual` cases (OTP/payment/destructive) are generated as `test.skip` and collected in
`manual-checklist.md`.

## Layout

```
test-cases-playwright-automater/
├── SKILL.md                         # the workflow Claude follows
├── config.example.json              # copy to automater.config.json
├── references/
│   ├── project-layout.md            # scaffold, config interview, auth bridging, override seams
│   ├── step-mapping.md              # JSON step → Playwright call, assertions, locators, flakiness
│   ├── category-patterns.md         # how each of the 13 categories becomes a test
│   └── sync-and-diff.md             # snapshot diff, tamper/override detection, PR + report shape
├── assets/project/                  # the template Playwright project (scaffold copies this)
│   ├── playwright.config.ts, global-setup.ts, tsconfig.json, package.json
│   ├── fixtures/, helpers/ (axe, timing, security), overrides/
│   └── .github/workflows/e2e.yml
└── scripts/
    ├── scaffold.mjs                 # copies + parameterises the template project
    ├── sync_plan.mjs                # diffs new JSON vs snapshot → added/changed/removed + review flags
    └── sync_finalize.mjs            # rewrites snapshot, builds sync-report.md from the plan + run results
```

## The companion skills

- **Input** comes from `exploratory-test-cases-generator` — this skill reads that skill's
  `references/json-contract.md` as its input contract.
- **The push skill** (JSON → Jira/Notion/Sheets) is independent and runs off the same JSON; this skill reads
  the `sync` object the push skill writes but never changes it.
