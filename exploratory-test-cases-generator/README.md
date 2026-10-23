# exploratory-test-cases-generator

A Claude skill that explores a running web app with Playwright MCP and writes structured JSON test cases from
what it finds — UI, functional, negative, edge, flakiness, accessibility, security, performance, responsive,
state/navigation, usability and network-failure cases, plus end-to-end journeys. The JSON is shaped so a
*separate* skill can push the cases into Jira, Notion, Confluence or Google Sheets.

## Install (personal skill)

Copy the folder into your skills directory and restart Claude Code (or reload the Code tab):

```bash
cp -r exploratory-test-cases-generator ~/.claude/skills/
```

## Prerequisites

- **Claude Code engine** — the CLI, or the Code tab of the Claude desktop app (needs subagents + a shell).
- **Microsoft Playwright MCP** — `@playwright/mcp`. One server entry per role, each with its own persistent
  profile, so a login survives between runs. See `references/config-and-safety.md` for the exact snippet.
- **Node 18+** — the two bundled scripts are dependency-free ESM.

## Use

Just ask, e.g. *"explore my staging app at staging.acme.test and write test cases"*, or run it as a slash
command. On the first run it asks a few setup questions and writes `exploratory-tests.config.json`
(see `config.example.json`). Then it:

1. discovers pages (repo routes + crawl + sitemap), collapsing `/orders/:id`-style routes to one instance;
2. groups them by feature and opens a **visual selection screen** in the browser — you tick groups/pages, set
   the data-mutation mode, and pick which roles to include, then Confirm;
3. logs you in once per role (you type credentials, never the skill);
4. explores each selected page in its own subagent, writing cases as it goes;
5. **pauses after the first page** so you can check quality and adjust (priority floor, categories, caps);
6. builds end-to-end journeys and a one-time shared-chrome suite;
7. merges, validates, and hands you `test-cases.json`, `findings.json`, `coverage.md` and an `evidence/` folder.

Re-runs resume where they stopped and diff against the previous output — cases are marked `added` / `changed`
/ `obsolete`, and any downstream sync IDs the push skill wrote back are preserved so updates hit the same
records.

## Safety

- **Production guard** is always on: mutations happen only on hosts in your non-prod allowlist; anything else
  is forced read-only.
- Logout, delete, pay, send, invite and the denylist are never clicked — they're written up as
  `requiresManual` cases instead.
- Created data is prefixed `QA_AUTO_<timestamp>` and listed for you to clean up (never auto-deleted).

## Layout

```
exploratory-test-cases-generator/
├── SKILL.md                         # the workflow Claude follows
├── config.example.json              # copy to exploratory-tests.config.json
├── references/
│   ├── json-contract.md             # the test-case schema (shared with the push skill)
│   ├── exploration-playbook.md      # how deep to explore, state bounding, mutation safety
│   ├── test-categories.md           # the 13 categories, flakiness, observed-vs-inferred, dedup
│   ├── security-and-nfr.md          # which a11y/perf/security checks to actually run
│   └── config-and-safety.md         # config interview + per-role auth setup
├── assets/
│   └── selection-ui.html            # the page-selection screen template
└── scripts/
    ├── build_selection_ui.mjs       # inlines pages.json into the selection screen
    └── merge_and_validate.mjs       # merges per-page files, validates, preserves sync, writes coverage
```

## The companion push skill

This skill deliberately stops at JSON. The downstream skill reads `references/json-contract.md` as its input
contract: one `testCases[]` record maps to one Jira issue / Notion row / Confluence row / Sheet row, it writes
downstream IDs back into each case's `sync` object, and this skill preserves those on the next run.
