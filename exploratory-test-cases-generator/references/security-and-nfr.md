# Security & Non-Functional Checks

The user chose to *run* lightweight non-functional checks and benign security probes (not just write cases
about them), so their results become real baselines and evidence. This file says exactly what to execute,
what to only generate, and the hard limits on the security side.

Every probe here is also bounded by the always-on rules: **security probes run only on hosts in the config's
non-production allowlist**, never against production, and nothing here ever tries to alter or exfiltrate data.

## Accessibility — run axe-core

On each explored page, inject axe-core and run it, then turn violations into `accessibility` cases and the
raw scan into evidence.

- Inject via the Playwright MCP's script/evaluate tool (load axe from a CDN or a bundled copy, then run
  `axe.run()`), and capture the violations JSON into `evidence/<page-id>/axe.json`.
- If the site's Content-Security-Policy blocks injecting axe, fall back to checks you can do from the
  accessibility snapshot (labels/names, heading order, focus order, landmark roles) and note in the affected
  cases that the automated scan was blocked.
- Each distinct violation type becomes one case with `basis: observed`; link the scan file in `evidence`.

## Performance — measure, don't guess

Per page, read the browser's own timing rather than estimating:

- Navigation timing (TTFB, DOMContentLoaded, load) and Largest Contentful Paint via the Performance API
  (`performance.getEntriesByType('navigation')`, the LCP observer).
- Count console errors and failed network requests during load.
- Note behaviour with a large data set where the page shows lists/tables.

Write these numbers into the `performance` cases as baselines (`observedBehavior`) and flag anything clearly
slow (e.g. LCP well over a few seconds) as a `slow-page` finding.

## Console & network watch (always, every page)

Keep the console and network log open throughout exploration. These feed `findings.json` directly:

- Uncaught exceptions / console errors → `console-error` finding.
- HTTP 5xx (and unexpected 4xx) → `http-5xx` finding.
- Requests that fail or hang → noted on the relevant `network-failure` case.
- Broken links found while crawling → `broken-link` finding.

## Testability finding

If a page exposes **no** `data-testid`/stable test attributes, raise a `missing-testids` finding. It's not a
user-facing bug, but it's the single thing that most determines whether these cases can later be automated
cheaply, so it's worth surfacing to the team.

## Security probes

Run categories 1–4 below (the user enabled them). They are passive or use harmless markers; none attempts to
damage data, escalate for real, or brute-force. Category 5 stays **off** by default.

**1. Passive checks** — read-only inspection, no input:
- Security headers on the main document: CSP, HSTS, X-Frame-Options (or frame-ancestors), X-Content-Type-Options.
- Cookie flags: HttpOnly, Secure, SameSite on session cookies.
- Mixed content (http resources on an https page).
- Sensitive-looking data in URLs or `localStorage`/`sessionStorage` (tokens, emails, ids in query strings).
- Each gap → a `security` case and, where it's a clear misconfiguration, a `security-header` finding.

**2. Output escaping** — enter a *harmless* marker such as `<i>qa-marker</i>` or `qa"marker` into text
fields that render back on screen, then check whether it comes back as literal text (good) or as rendered
HTML (an escaping defect). The marker does nothing; it only reveals whether the app escapes output. A rendered
marker → a `security` case (stored/reflected XSS risk) plus a finding.

**3. Access control** — the highest-value probes:
- Open a protected route with **no session** → expect a redirect to login, not the page.
- Swap a record id in a URL to another *test* record you own or to a sibling tenant's test record (IDOR) →
  expect an authorization block, not the other record's data.
- Using a **lower-privilege** role's session (from the role profiles in Phase 4), request an admin-only route
  → expect a block. This is where the N2 "check visibility per role" pass pays off.
- Each expectation becomes a `security` case; any route that leaks becomes a Critical finding.

**4. Input robustness** — put awkward-but-benign input into every field and watch for 500s, not for data
changes: long strings, quotes, unicode, emoji, control characters, leading/trailing whitespace. Payloads
designed to *alter* data or *execute* (SQL, template, command injection strings intended to run) are **not**
used — the goal is "does the app reject gracefully or fall over", and a 500 here is a finding.

**5. Rate-limit / brute-force (OFF by default)** — repeated failed logins etc. can lock real accounts, so do
not run these unless the user explicitly turns them on for a disposable environment. When off, still *generate*
the cases as `inferred` so the coverage exists.

## What's generated, not executed

To be explicit about the executed/generated split:

- **Executed** (results become baselines/evidence): axe-core, performance timing, console/network watch,
  passive security checks, output-escaping marker, access-control probes, input-robustness probing, mobile
  viewport pass, and network-failure cases where the MCP exposes network control.
- **Generated only** (`basis: inferred`): other browsers (Firefox/WebKit), other breakpoints, rate-limit /
  brute-force, injection payloads meant to execute, and anything behind the denylist (OTP/email/payment/
  destructive).
