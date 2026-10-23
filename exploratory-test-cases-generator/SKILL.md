---
name: exploratory-test-cases-generator
description: >-
  Explore a live web application with Playwright MCP and generate structured JSON test cases from what is
  actually there. Use this whenever the user wants to "explore the app and write test cases", generate or
  discover QA test cases for a web app, build a test suite from a running application, or get test coverage
  for pages they can log into. It discovers the app's pages, groups them, lets the user pick which to cover
  via a visual selection screen, drives a real browser through each page, and writes UI, functional, negative,
  edge/boundary, flakiness, accessibility, security, performance, responsive, state/navigation, usability and
  network-failure test cases into a single JSON file whose shape is designed to be pushed later into Jira,
  Notion, Confluence or Google Sheets. Trigger it even when the user only says something like "can you go
  through our staging app and give me test cases" without naming this skill.
---

# Exploratory Test Cases Generator

## What this skill is for

You are turning a *running* web application into a *written test suite*. You open the app in a real browser,
look at each page the way a thorough QA engineer would — opening every dropdown, submitting bad input,
watching the network — and you write down everything worth testing as structured JSON. You are **not**
executing a test framework and you are **not** generating `.spec` files. The deliverable is one JSON file of
test cases (plus a findings file and evidence), designed so a *separate* skill can later push those cases into
whatever tool the client uses.

Keep two ideas central the whole way through:

- **Observed is not the same as correct.** Exploration shows you what the app *does today*, which may include
  bugs. Never silently promote current behaviour into an "expected result". Every case carries a `basis` of
  `observed` or `inferred`, and when the two diverge you raise a finding instead of blessing the bug. See
  `references/test-categories.md`.
- **The JSON is a contract.** A downstream push skill reads this file. If you invent fields or rename them,
  that skill breaks. The one source of truth for the shape is `references/json-contract.md` — read it before
  writing any test case, and do not drift from it.

## Where this runs and what it needs

This skill assumes the Claude Code engine (CLI or the Code tab of the Claude desktop app): subagents and a
shell are available, and the skill is read from the user's skills directory. It also assumes **Microsoft's
official `@playwright/mcp`** server is configured, because the instructions below use its tool names and its
accessibility-snapshot model. If a page interaction fails, check the tool is the Microsoft one, not a
different Playwright MCP, before working around it.

Before the first real run, make sure a config exists (Phase 0) and that the user has logged in once per role
(Phase 4). Everything else the skill discovers on its own.

## The run, phase by phase

Set up a task list at the start so the user can watch progress while they step away, and tick phases off as
you go. Announce in one line what you are about to do, then start — do not wait for permission to begin
discovery; the only hard gate is the selection screen in Phase 3.

### Phase 0 — Config

Look for `exploratory-tests.config.json` in the working directory. If it is missing, run the short interview
in `references/config-and-safety.md` to build one, then save it. If it exists, load it and move on. The
config holds the base URL, optional repo path, output directory, environment and production guard, roles,
allowlist/denylist, which categories are on, and interaction budgets. Never ask the user for something the
config already answers.

**Production guard (always on, non-negotiable):** mutating actions are allowed *only* when the target host is
on the config's non-production allowlist. On any other host, force read-only mode regardless of the configured
mutation mode, and say so. This protects you from writing `QA_AUTO_` junk into a real customer's live system.

### Phase 1 — Discover pages (hybrid)

Build the page list from three sources and merge them; each covers the others' blind spots:

1. **Routes from the repo**, if `repoPath` is set. Parse the router for the framework in use — Next.js
   `app/` and `pages/`, React Router route configs, Angular route modules, Vue Router. This finds pages that
   exist in code even if nothing links to them yet.
2. **Crawl from the base URL**, same-origin only, following nav menus and in-page links, to depth 4 by
   default. This confirms what is actually reachable and catches pages the route parse missed (dynamically
   mounted routes, server-rendered links). Stop at infinite spaces — pagination, calendars, faceted search,
   anything that generates endless URLs from the same template.
3. **`sitemap.xml`**, merged in if one exists.

**Collapse parameterized routes to one representative instance.** `/orders/123`, `/orders/124` and
`/orders/125` are the same page: record the *template* `/orders/:id` once, pick one real instance to explore,
and turn the parameter variants (valid id, non-existent id, another user's id) into *test data* rather than
separate pages. This is what keeps a 10,000-row app down to a few dozen pages.

Produce `pages.json` — the list of page objects. See `references/json-contract.md` for the page shape; at
minimum each page needs an id, URL, route template, the roles that can see it, where it was found (code /
crawl / sitemap) and a cheap complexity hint (counts of forms, tables, modals) used later for test-count
estimates.

### Phase 2 — Group pages by inferred domain

Group the pages by feature/domain — Authentication, Dashboard, Orders, Admin, Settings, Billing, and so on —
inferred from nav structure, URL prefixes and page content together, not by any single signal. Each group
records which roles can see it and how many pages it holds. Good grouping is what makes the selection screen
fast to act on, so spend a little judgement here rather than grouping purely by URL prefix.

### Phase 3 — Selection screen (the one hard gate)

The user chooses what to cover on a visual screen, not in chat — this is the fastest way for them to act on a
30+ page app.

1. Run `node scripts/build_selection_ui.mjs pages.json assets/selection-ui.html selection.html`. This inlines
   the grouped page data into a self-contained `selection.html` (no server, no fetch, works the same in CLI
   and desktop).
2. Open `selection.html` in the Playwright browser (`browser_navigate` to its `file://` path). If `file://`
   is blocked, serve the directory with `node scripts/build_selection_ui.mjs --serve` and open the printed
   `http://localhost` URL instead.
3. The screen shows, per group, a checkbox that expands to per-page checkboxes, with select-all/none and a
   search filter; per page it shows URL, route template, visible-to roles, where it was found, and the
   complexity hint; per group it shows an estimated test count and run time with a running total; and on the
   same screen the user sets the **data-mutation mode** for this run (read-only / safe / full, defaulting to
   safe) and ticks **which roles** to include. One Confirm sets up the whole run.
4. When the user clicks Confirm, the page stores the full selection on `window.__QA_SELECTION__` and renders
   it into a visible `<pre id="qa-selection-output">`. Read it back with `browser_evaluate` returning
   `window.__QA_SELECTION__`. Poll every couple of seconds until it is present; do not proceed on an empty
   selection.

Persist the returned selection into `pages.json` as `include: true/false` per page, plus the chosen mutation
mode and roles, so a re-run can skip the screen if the user says "same as last time".

### Phase 4 — Authentication (per selected role)

Never type credentials yourself and never put them in prompts. For each role the user selected, the config
names a dedicated Playwright MCP server entry with its own persistent browser profile (one profile per role —
switching sessions inside a single instance at runtime is unreliable). For each role in turn: open its
browser, let the user log in manually once in the headed window (this handles SSO, OTP and CAPTCHA), confirm
the session is live, and move on. The profile keeps the session for later runs. If `config-and-safety.md` says
the app is public, skip this phase.

Explore fully with the **primary** role. For every other selected role, do a lighter pass that only records
which pages and actions are visible, which feeds the RBAC/authorization and access-control tests — you are not
re-running the whole suite per role.

### Phase 5 — Explore each selected page

Explore one page at a time, each in its own fresh subagent, so page snapshots (which are heavy) do not pile up
and degrade quality over a long run. The main session orchestrates; each subagent explores exactly one page,
writes its own file, and returns a one-line summary.

Give each page subagent this briefing (fill in the specifics):

```
You are exploring ONE page of a web app to produce test cases. Do not touch other pages.
- Page: <id, url, route template, group, visible-to roles>
- Mutation mode for this run: <read-only | safe | full>  (never exceed it; production guard still applies)
- Denylist (never click / never visit): <from config>
- Read references/exploration-playbook.md for HOW DEEP to go and how to bound interactions.
- Read references/test-categories.md for WHICH test cases to write and how to tag basis/confidence/flakiness.
- Read references/json-contract.md for the EXACT JSON shape of a test case. Do not deviate.
- Read references/security-and-nfr.md for the accessibility, performance and security checks to actually run.
- Write your test cases to .work/<page-id>.json and any real defects you hit to .work/findings-<page-id>.json.
- Save screenshots to evidence/<page-id>/ for the default state and each distinct state that produced a test.
- Return ONLY: page id, number of test cases by category, number of findings, and anything that blocked you.
```

Shared chrome — the nav, header, footer, global search, toast system — appears on every page. Do **not** let
each page subagent re-test it. It is tested once in Phase 8; page subagents test only what is specific to
their page and reference the global suite.

**If subagents cannot reach the Playwright MCP** in the user's setup, fall back to exploring pages sequentially
in the main session, writing each page's `.work/` file immediately before moving on. Same output, just no
isolation. Confirm which mode is in play early rather than discovering it halfway.

### Phase 6 — Calibration pause (after the first page only)

After the first page's file is written, **stop and show the user its test cases** before continuing. This is
the cheapest moment to course-correct. Let them approve and continue, and let them adjust for the rest of the
run: minimum priority to keep (e.g. drop P3s), categories on/off globally, max tests per page, and whether
expected results should lean strict or lenient on inferred bugs. Apply their adjustments to the config for the
remaining pages, then run the rest autonomously without pausing again.

### Phase 7 — Journeys pass

Once the individual pages are explored, do one pass that stitches them into end-to-end journeys — the flows a
per-page view can't see, like signup → onboarding → first project, or create → list → edit → delete. Infer
these from the pages actually explored (there are no requirements docs feeding this). Write each journey as a
normal test case with `category: "e2e-journey"` and a `pageIds` list of the pages it spans, so it rides the
same output and the same downstream push pipeline as everything else.

### Phase 8 — Global / shared components suite

Write the shared-chrome tests once, under a synthetic page `PG-GLOBAL` with `group: "Global"`: nav links,
header actions, footer, global search, toast/notification behaviour, session menu, responsive behaviour of the
shell. Every page's file references this suite rather than repeating it.

### Phase 9 — Merge, validate, report

Run `node scripts/merge_and_validate.mjs` to:

- merge every `.work/<page>.json` into a single `test-cases.json` with the top-level `meta`, `pages`,
  `sharedTestData` and `coverage` sections (flat `testCases[]` array);
- merge every `.work/findings-*.json` into `findings.json`, including the list of `QA_AUTO_` records created
  during safe mutations so the user can clean them up (report-only — never auto-delete);
- validate every test case against the field contract (required fields present, enum values legal, locators
  well-formed) and fix or flag anything invalid before finishing;
- preserve any `sync` IDs carried over from a previous `test-cases.json` (see re-runs below);
- compute the `coverage` summary (counts by category, priority, group; pages with no tests; tests with no
  assertions) and write a short `coverage.md`.

Do a final self-review on the merged file: remove duplicate cases, check each selected category actually
produced cases, and catch any case that asserts nothing. Then hand over `test-cases.json`, `findings.json`,
`coverage.md` and the `evidence/` folder, and print the coverage summary in chat rather than writing a
separate chat transcript file.

## Re-running on an app that changed

Re-runs resume and diff rather than starting over:

- A progress manifest (`.work/progress.json`) lets an interrupted run pick up where it stopped — already-
  explored pages are skipped unless the user forces a re-explore.
- Test IDs and `fingerprint`s are deterministic (see the contract), so the same test keeps the same identity
  across runs.
- The merge compares against the existing `test-cases.json` and marks each case `added`, `changed` or
  `obsolete` (status field) instead of overwriting. Obsolete cases are kept, never deleted, so the `sync` IDs
  that the downstream push skill wrote back survive and updates land on the same Jira issue / Notion row.

## Safety rules that are always on

These hold in every phase, regardless of config or user urging:

- **Production guard** — mutations only on allowlisted non-production hosts; everything else is read-only.
- **Never submit session-ending or irreversible actions** uninvited — logout, delete, pay, send email/SMS,
  invite users. Destructive steps are *written up* as test cases flagged `requires_manual`, not performed.
  Anything genuinely destructive asks the user first even in safe mode.
- **Skip the denylist** — external domains, payment gateways, third-party iframes, and the user's own URL/button
  denylist. OTP/email/SMS-gated flows are written up as `requires_manual` rather than driven.
- **Credentials** are entered only by the user, only in the headed browser, only during Phase 4. They never
  appear in prompts, config, output or logs.
- **Test data** created in safe mode is prefixed `QA_AUTO_<timestamp>` and listed for manual cleanup.

## Reference files

Read these as the phases call for them; they hold the detail that doesn't belong in this overview.

| File | Read it when | Holds |
|---|---|---|
| `references/json-contract.md` | before writing any test case or the merge | the full field spec — the contract the push skill depends on |
| `references/exploration-playbook.md` | before/while exploring a page | how deep to go, how to bound state combinations, mutation safety |
| `references/test-categories.md` | while writing cases | the 13 categories, flakiness annotation, observed-vs-inferred, dedup |
| `references/security-and-nfr.md` | while exploring | which accessibility/performance/security checks to actually run |
| `references/config-and-safety.md` | Phase 0 / Phase 4 | the config interview, config schema, auth-per-role setup |
