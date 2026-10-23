# Project Layout, Config & Auth

The shape of the generated suite, how to configure it, and how it authenticates by reusing the explorer's
role sessions. The static parts are written by `scripts/scaffold.mjs`; this file explains them and the seams
a human uses to customise without touching generated code.

## Directory layout

```
<app>-e2e/
├── playwright.config.ts            # one project (primary role); trace/screenshot/video on first retry
├── global-setup.ts                 # prepares storageState per role (reuse profiles → .env fallback)
├── automater.config.json           # this skill's config (see below)
├── .env.example  /  .env            # creds for the .env auth fallback (.env is gitignored)
├── fixtures/
│   └── index.ts                    # `test`/`expect` extended with asRole + shared test data
├── helpers/
│   ├── axe.ts                      # accessibility scan wrapper
│   ├── timing.ts                   # navigation-timing / LCP capture
│   └── security.ts                 # header/cookie checks, cross-role context helpers
├── pages/
│   ├── generated/<Name>Page.ts     # GENERATED — locators + basic actions. Never hand-edit.
│   └── <Name>Page.ts               # YOURS — subclass of the generated base. Override here.
├── tests/<page-slug>.spec.ts       # GENERATED — one spec per page
├── journeys/<slug>.journey.spec.ts # GENERATED — e2e-journey cases
├── overrides/
│   └── index.ts                    # fingerprint → custom test body, for cases you fully take over
├── .sync/
│   ├── last.json                   # saved JSON snapshot + generated-file hashes (sync + tamper guard)
│   └── plan.json                   # last sync's computed plan (written by sync_plan.mjs)
├── manual-checklist.md             # requiresManual cases, generated
├── sync-report.md                  # generated each run
└── .github/workflows/e2e.yml       # CI: push/PR + manual dispatch, uploads HTML report
```

## `automater.config.json`

```json
{
  "projectDir": "../acme-e2e",
  "explorerConfig": "../qa-exploration/exploratory-tests.config.json",
  "testCasesPath": "../qa-exploration/test-cases.json",
  "primaryRole": "admin",
  "auth": {
    "mode": "reuse-or-env",
    "storageStateDir": "./.auth",
    "roleProfiles": { "admin": "../qa-exploration/.profiles/admin", "member": "../qa-exploration/.profiles/member" }
  },
  "browsers": ["chromium"],
  "run": { "afterGenerate": true, "onlyAffectedOnSync": true, "retries": { "low": 0, "medium": 1, "high": 2 } },
  "validateLocatorsLive": true
}
```

First-run interview — ask only these, infer the rest:
1. Where should the generated suite live (`projectDir`)?
2. Path to `test-cases.json` and, if it exists, the explorer config.
3. Which role is primary (full-run role)? Default: the JSON's `meta.primaryRole`.
Everything else takes the defaults above.

## Auth — reuse the explorer's sessions (M3), bridge profiles → storageState

The explorer logs in with persistent browser **profiles** (`--user-data-dir`), not `storageState` JSON. The
generated suite wants `storageState`. `global-setup.ts` bridges them, per configured role, in this order:

1. If `./.auth/<role>.json` already exists and is fresh, use it.
2. Else if a `roleProfiles[<role>]` directory exists, launch a one-off persistent context on it and export
   `context.storageState({ path: './.auth/<role>.json' })` — this reuses the login the user already did in the
   explorer, with no new sign-in.
3. Else if `.env` has `E2E_<ROLE>_USER` / `E2E_<ROLE>_PASS`, run the login flow and export storageState.
4. Else leave that role without a session; tests needing it `test.skip` with a clear reason.

The single Playwright **project** uses the primary role's storageState (N3). Cross-role and unauthenticated
security tests load other roles' storageState (or a bare context) inline — see `category-patterns.md` — which
is why global-setup prepares *all* configured roles even though the default project only uses one.

## The override seams (why re-sync is safe)

Three places a human customises, none of which a sync overwrites:

- **`pages/<Name>Page.ts`** — a subclass of the generated `pages/generated/<Name>Page.ts`. Add methods or
  override a locator here. The generator creates this file once, then never touches it again.
- **`overrides/index.ts`** — maps a `fingerprint` to a full custom test function. When a generated spec sees
  an override for its case, it delegates to it instead of running the generated body. Use this when a case
  needs logic the generator can't express.
- **`helpers/`** — shared custom assertions and utilities.

On a sync, a *changed* case whose fingerprint has a subclass override or an `overrides/` entry is regenerated
*and flagged in the PR* ("this case changed and you've customised it — confirm your override still holds"),
rather than silently regenerated over. A generated file whose hash no longer matches `.sync/last.json` (someone
edited it directly, against the model's intent) is likewise flagged, not clobbered.
