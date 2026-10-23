# Config & Safety Setup

Covers Phase 0 (build/load the config) and Phase 4 (auth per role). Keep the first-run interview short — ask
only what you cannot discover, and infer the rest from a quick look at the base URL.

## First-run interview

If `exploratory-tests.config.json` is absent, ask for just these, then write the file:

1. **Base URL** of the app to explore.
2. **Is this a non-production environment?** (staging/dev/test/local). The host goes on the non-prod allowlist
   only if yes — this is what unlocks mutations. If they're unsure, treat it as production (read-only).
3. **Repo path** (optional) — enables route parsing in Phase 1. Skip if they don't have it handy.
4. **Roles** to cover, by name (e.g. admin, member, guest). For each non-public role you'll set up a browser
   profile in Phase 4.
5. **Anything off-limits** — URL patterns or button labels to never touch, beyond the built-in denylist.

Everything else has a sensible default (below) and can be changed later by editing the file. Don't interrogate
the user about categories or budgets on the first run unless they bring it up; the defaults are good.

## Config schema

`exploratory-tests.config.json`:

```json
{
  "app": { "name": "Acme Admin", "baseUrl": "https://staging.acme.test" },
  "repoPath": "/Users/varun/code/acme-web",
  "outputDir": "./qa-exploration",
  "environment": {
    "name": "staging",
    "isProduction": false,
    "nonProdAllowlist": ["staging.acme.test", "localhost", "127.0.0.1", "*.acme.test"]
  },
  "mutationMode": "safe",
  "roles": [
    { "name": "admin",  "isPrimary": true,  "mcpServer": "playwright-admin",  "profileDir": "./.profiles/admin" },
    { "name": "member", "isPrimary": false, "mcpServer": "playwright-member", "profileDir": "./.profiles/member" },
    { "name": "guest",  "isPrimary": false, "mcpServer": null,                "profileDir": null, "public": true }
  ],
  "denylist": {
    "urlPatterns": ["*/logout", "*/billing/pay", "https://*.stripe.com/*"],
    "buttonLabels": ["Delete account", "Deactivate", "Pay now", "Send invites"]
  },
  "categories": {
    "functional": true, "ui": true, "negative": true, "boundary": true, "flakiness": true,
    "accessibility": true, "security": true, "performance": true, "responsive": true,
    "state-navigation": true, "usability": true, "network-failure": true, "localization": false
  },
  "gherkin": false,
  "crawl": { "maxDepth": 4, "sameOriginOnly": true },
  "interactionBudgetPerPage": 150,
  "viewport": { "desktop": "1440x900", "mobile": "390x844" },
  "security": { "rateLimitProbes": false },
  "calibration": { "minPriority": "P3", "maxTestsPerPage": null, "inferredBugStance": "flag" }
}
```

Notes:
- `mutationMode` here is the default; the selection screen sets it per run. The production guard overrides both
  — a host not matching `nonProdAllowlist` is read-only no matter what.
- `localization` is off per the user's category choice; flip it on only if they ask.
- `calibration` is seeded with defaults and updated in place when the user adjusts at the Phase 6 pause.

## Playwright MCP — one server per role

Role switching inside a single Playwright MCP instance at runtime is unreliable, so each non-public role gets
its own MCP server entry pointing at its own persistent browser profile. Give the user a snippet like this for
their MCP config (Microsoft `@playwright/mcp`), one block per role:

```json
{
  "mcpServers": {
    "playwright-admin": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--user-data-dir=./.profiles/admin", "--viewport-size=1440,900"]
    },
    "playwright-member": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--user-data-dir=./.profiles/member", "--viewport-size=1440,900"]
    }
  }
}
```

The persistent `--user-data-dir` is what lets a login survive between runs, so the user logs in once per role
rather than every run.

## Phase 4 auth flow

For each selected non-public role, in turn:

1. Make sure that role's MCP server is the active Playwright server.
2. Navigate to the app; if it redirects to login, **ask the user to log in manually in the headed window** and
   tell you when they're done. Do not type credentials or read them from anywhere.
3. Confirm the session is live (land on an authenticated page), then proceed.

Mid-run, if a page unexpectedly redirects to login (session expired on a long run), pause, ask the user to
re-login in the headed browser, then resume the current page from where you were — don't abort the whole run.

Public roles (`"public": true`) need no login; explore them straight away.
