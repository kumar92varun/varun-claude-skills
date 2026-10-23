# Sync & Diff

How a later run reconciles the generated suite with an edited `test-cases.json`. The mechanism is a snapshot
diff (your E3 choice) plus a file-hash guard so human edits and overrides are never clobbered (your H3
choice). Change detection runs in `scripts/sync_plan.mjs`; this file explains the model so you apply the plan
correctly.

## What `.sync/last.json` holds

Written by `sync_finalize.mjs` at the end of every successful run:

```json
{
  "snapshotAt": "2026-10-23T14:00:00Z",
  "cases": { "<fingerprint>": { "id": "TC-...", "hash": "<sha256 of the case's normalized JSON>" } },
  "generatedFiles": { "tests/orders-detail.spec.ts": "<sha256>", "pages/generated/OrdersDetailPage.ts": "<sha256>" }
}
```

- `cases` is the snapshot of the JSON as it was last synced — the baseline the new JSON is diffed against.
- `generatedFiles` is the hash of every file the generator wrote, so a later run can tell if one was edited by
  hand (tamper guard).

## How `sync_plan.mjs` classifies each case

Diff the new JSON's cases against `.sync/last.json → cases`, keyed by `fingerprint`:

- **added** — fingerprint in new JSON, not in snapshot → generate it.
- **removed** — fingerprint in snapshot, not in new JSON → delete its test (and prune the page object if it
  becomes unused).
- **changed** — fingerprint in both, case hash differs → regenerate it.
- **unchanged** — hash identical → leave as is.

Then, for each **changed** case, decide whether it's safe to regenerate silently:

- **customizedChanged** — the case changed *and* a human has customised it: a method override in
  `pages/<Name>Page.ts`, an `overrides/` entry for the fingerprint, or any generated file whose current hash
  ≠ the stored `generatedFiles` hash (direct edit). Regenerate the generated artifact, but **keep the override
  in place** and add the case to the PR review list. Never overwrite the human's seam.

`tampered` (generated files whose hash drifted) are listed separately so the human knows a file they edited is
being regenerated — the edit should have gone in a seam, and the report says so.

The plan is written to `.sync/plan.json`:
```json
{
  "added": ["..."], "changed": ["..."], "removed": ["..."],
  "customizedChanged": ["..."], "tampered": ["pages/generated/XPage.ts"]
}
```

## Applying the plan

Work the plan in this order so the tree stays consistent: generate **added**, regenerate **changed**
(respecting customizedChanged), delete **removed** and prune, leave **unchanged** untouched. Only the affected
specs need regenerating — don't rewrite the whole suite on a small diff.

## Finalise and PR

`sync_finalize.mjs` recomputes `.sync/last.json` (new snapshot + fresh file hashes) and writes
`sync-report.md`:

```markdown
# Sync report — 2026-10-23
Added 4 · Changed 2 · Removed 1 · Unchanged 406

## Review needed
- TC-ORDERS-DETAIL-NEG-003 — changed in JSON and has an override in pages/OrdersDetailPage.ts; confirm it still holds
- pages/generated/LoginPage.ts — was edited by hand; regenerated. Move that edit into pages/LoginPage.ts.

## FIXME locators
- OrdersDetailPage.openStatusDropdown — not found on /orders/1024 during validation

## TODO assertions
- TC-CHECKOUT-FUNC-007 — "order total recalculates" was prose; assertion not implemented

## Candidate findings (tests left red)
- TC-ADMIN-SEC-002 — /admin reachable with a member session (possible broken access control)
```

Then open the PR (`Sync: +4 / ~2 / −1 tests`) with this report as the body. First runs skip the PR and instead
print the local `gh repo create` / `git remote add` steps — this skill scaffolds and commits locally but does
not create the remote itself.

## Why the hash guard matters

Under the "JSON is source of truth" model, the clean path is: customise only in the seams, and sync never
surprises you. But people do edit generated files sometimes. The hash guard turns that from a silent
data-loss bug into a visible, reviewable line in the PR — the edit is preserved long enough for the human to
move it to a seam, instead of vanishing on the next regenerate.
