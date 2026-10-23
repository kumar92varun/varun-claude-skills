# Exploration Playbook

How to explore a single page thoroughly without drowning in states or damaging data. Read this before
exploring; it pairs with `test-categories.md` (what to write) and `security-and-nfr.md` (what to measure).

## How deep to go

Go past a surface snapshot. On each page:

- Catalogue every interactive element: inputs, buttons, links, dropdowns, toggles, tabs, accordions, modals,
  hover menus, context menus, drag handles, file pickers.
- Actually open things — expand every dropdown, open every modal, switch every tab, trigger every hover menu
  — because validation rules, option lists and error copy only reveal themselves when opened.
- Probe validation: submit empty, submit invalid, exceed limits, and **record the actual error messages** as
  seen, since those exact strings become `expectedResult` text.
- Watch the network and console the whole time (see `security-and-nfr.md`): a 500, a failed request or an
  uncaught error is a finding even when the UI looks fine.

## Bounding the state space (this is where runs blow up)

A list page with 5 filters, 4 sort orders, pagination and 3 view modes has hundreds of states. Exhausting
them is waste. Bound interaction three ways at once:

1. **Pairwise (all-pairs) coverage** across independent controls. Most defects surface from pairs of settings,
   not from rare high-order combinations, so cover every *pair* of option values rather than every full
   combination.
2. **Exhaustive only when small** — if a control group has 20 or fewer total combinations, just try them all;
   pairwise isn't worth it below that.
3. **Interaction budget per page** (default 150 actions, from config). When the budget is spent, stop
   *interacting* and write the remaining worthwhile cases as `basis: inferred` with a `confidence` that
   reflects that you reasoned them rather than saw them.

The point of the budget is not to cap quality but to stop one pathological page starving the rest of the app.

## Mutation safety

The run's mutation mode (chosen on the selection screen) and the always-on production guard together decide
what you may do:

- **read-only** — type into fields, trigger client-side validation, open things, but never submit anything
  that writes. Good default for unfamiliar or shared environments.
- **safe** (default) — create and update data, but only tagged `QA_AUTO_<timestamp>`; never delete, pay, send
  email/SMS, or invite; ask before anything that even looks destructive. List everything created for manual
  cleanup.
- **full** — assume a disposable environment; still never cross the denylist and still ask before truly
  irreversible actions.

Regardless of mode, the **production guard wins**: on a host not in the non-prod allowlist, force read-only.
When you downgrade a planned mutation to read-only because of the guard, still write the mutation's test case —
just mark its destructive steps `requiresManual: true`.

## What to skip (denylist)

- Session-ending / irreversible controls: logout, delete, pay, send, invite, "deactivate account". Write them
  up as cases (`requiresManual: true`); do not click them.
- External domains, payment gateways, third-party iframes — out of scope and often brittle or chargeable.
- OTP / email / SMS-gated steps — write the case flagged `requiresManual`, since you can't receive the code.
- The user's own URL-pattern and button-label denylist from config.

## Representative instances for parameterized routes

You explore one real instance of `/orders/:id`. Turn the parameter into negative/boundary/security test data
rather than new pages: a valid id (happy path), a non-existent id (expect a clean 404, not a crash), an id
belonging to another user or another tenant (expect an authorization block — this is the IDOR case in
`security-and-nfr.md`), a malformed id (expect validation, not a 500).

## A note on PII

Staging data often looks real. When you copy a value out of a live record into `testData` or a step — an
email, a phone number, a person's name — you are moving it into a file that will land in the client's Jira or
Notion. This run does not mask it (the user chose raw values), so prefer synthetic `QA_AUTO_` data you create
over scraping a real row whenever you have the choice, and keep screenshots of pages showing customer records
local. (If the user later asks for masking, the merge step can redact email/phone/name patterns.)

## Writing as you go

Write each page's `.work/<page-id>.json` before moving on, and its findings to `.work/findings-<page-id>.json`.
Capture a screenshot for the page's default state and for each *distinct* state that produced a test — not for
every click, or the evidence folder balloons. Keep every case conformant to `json-contract.md` as you write
it; fixing shape afterwards is far more expensive than getting it right once.
