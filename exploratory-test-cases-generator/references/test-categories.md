# Test Categories

What kinds of test cases to write, how to tag them, and how to avoid generating the same thing fifty times.
The categories enabled for a run come from config; this file says what each one means and what good coverage
of it looks like. Treat these as prompts for your judgement, not a checklist to pad — a thin page should
produce few cases, a rich one many.

## The categories

**functional** — the happy paths. Each meaningful action the page offers, performed with valid input, reaching
the intended outcome. This is the backbone; most other categories are variations on these.

**ui** — layout, content and visual state. Labels present and correct, empty states, loading states, disabled
states, truncation, alignment, counts and badges matching data, correct active-nav highlighting.

**negative** — invalid input and misuse. Wrong credentials, malformed email, required field left blank,
mismatched confirmation, wrong file type, submitting twice. Assert the *right* rejection: the real error
message, the field staying focused, no partial write.

**boundary** — the edges of valid ranges. Min and max lengths, 0 / 1 / max quantities, just-inside and
just-outside limits, date range ends, pagination first/last page, very long strings, unicode and emoji where
text is accepted.

**flakiness** — two things, both wanted (the user asked for both). First, cases that *deliberately* stress
flakiness-prone behaviour: rapid double-clicks, submitting before an async load finishes, debounced search,
races between two requests, animations mid-transition, slow network. Second, a `flakiness` annotation on
*every* test giving its risk level, the likely cause, and how to stabilise it (e.g. "wait for the
`/api/orders` response before asserting the row count"). The annotation is what makes the suite automatable
later without mystery failures.

**accessibility** — WCAG 2.2 AA. Keyboard-only operation and visible focus order, labels and names on
controls, colour contrast, alt text, ARIA roles on custom widgets, error messages announced. Back these with
the axe-core scan in `security-and-nfr.md` rather than guessing.

**security** — see `security-and-nfr.md` for exactly what to probe and what only to generate. Covers output
escaping, access control / IDOR, auth bypass, input robustness, and passive header/cookie checks.

**performance** — page load and responsiveness. Navigation timing and LCP for the page, interaction latency on
the main action, behaviour with a large data set, no layout thrash. Baselines come from the real measurements
in `security-and-nfr.md`.

**responsive** — layout and function across viewports. Explore in Chromium at desktop width plus one real
mobile-viewport pass; write those as `observed`. Generate the other breakpoints and Firefox/WebKit variants as
`inferred` — running every browser triples the time for little extra signal at this stage.

**state-navigation** — what happens around the page, not just on it. Refresh mid-flow, browser back/forward,
deep-linking straight to the page, opening it in a second tab, session expiry, unsaved-changes warnings, state
surviving (or correctly not surviving) a reload.

**usability / UX** — friction a user would feel: unclear affordances, missing confirmation, no feedback after
an action, destructive actions without a guard, confusing empty states. These are more judgement than
assertion; keep them concrete and tie each to the element that caused it.

**network-failure** — the app under bad network. API returning 4xx/5xx, a request timing out, slow 3G,
offline. Execute these only where the Playwright MCP build exposes network control (request routing / offline
mode); otherwise generate them as `inferred` and note that in the case. Assert graceful degradation — a real
error state, a retry, no infinite spinner, no silent data loss.

**e2e-journey** — multi-page flows (Phase 7). `category: "e2e-journey"`, `pageIds` populated. Build from the
pages you actually explored: create → list → edit → delete, signup → onboarding → first action, add-to-cart →
checkout (stopping at the payment denylist).

## Observed vs inferred — do not bless bugs

Exploration reveals current behaviour, which can include defects. For every case:

- `basis: observed` — you saw the app do this. `basis: inferred` — you reasoned it should be tested but did not
  (or could not) observe it.
- `expectedResult` always states the **intended** behaviour. When what you observed looks wrong, put the
  intended behaviour in `expectedResult`, record what actually happened in `observedBehavior`, raise a
  `findings.json` entry, and link it via `relatedFindings`. Never copy a buggy observation into
  `expectedResult` just because that's what the app did — that would turn the test suite into a monument to the
  bug.
- Set `confidence` honestly: `high` for a clearly observed, unambiguous behaviour; `low` for an inferred case
  on a flow you couldn't fully reach.

The calibration pause (Phase 6) lets the user set how strict to be about flagging inferred bugs for the rest of
the run; respect that setting.

## Priority and severity

Give every case a `priority` (P0–P3) and `severity` (Critical/Major/Minor/Trivial). P0/Critical is reserved
for things that block core use or expose data; most UI-polish and edge cases are P2/P3. There is no hard cap on
cases per page — priority is the lever the user uses at the calibration pause to trim (e.g. "drop P3s") rather
than a count limit.

## Deduplication — test shared things once

The header, footer, nav and toast system are on every page. Without discipline you'd emit the same twenty
cases across fifty pages. So:

- Shared chrome is tested **once** under `PG-GLOBAL` / `group: "Global"` (Phase 8). Page files reference it;
  they do not repeat it.
- Within a page, collapse near-identical cases: if five form fields share the same "required" validation,
  write the pattern once with the fields as data rather than five copies.
- The merge step does a final duplicate sweep by `fingerprint`; keep fingerprints meaningful so it can.
