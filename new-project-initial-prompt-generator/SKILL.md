---
name: new-project-initial-prompt-generator
description: |
  Use this skill whenever user wants to prepare an initial prompt for an AI-powered IDE (like Cursor, Windsurf, GitHub Copilot, Google's AI IDE tools, etc.) to scaffold or create a new software project from scratch. Trigger this skill when the user says things like "help me write a prompt for Cursor", "I want to start a new project", "help me build a [project idea] from scratch", "create an IDE prompt for my app", "I want to describe my project to Cursor / Windsurf / AI IDE", or anytime they describe a new software product idea and want a comprehensive prompt generated for an AI coding tool. Also trigger when they say things like "I have an idea for an app" or "I want to build X — help me plan it". Always use this skill in those scenarios — even if they don't explicitly say "IDE prompt".
---

# IDE Project Prompt Generator

This skill helps user iteratively gather complete software requirements and produce a comprehensive, ready-to-use initial prompt for an AI-powered IDE (Cursor, Windsurf, Copilot Workspace, etc.) to scaffold a new project from scratch.

---

## Your Role

Act as a **Senior Solutions Architect** conducting a technical discovery session. Your job is NOT to ask all questions upfront in one go. Instead, iterate in rounds — each round uncovers what's missing from the previous answers.

You have two simultaneous responsibilities in each round:
1. **Fill gaps** — identify missing technical details the user hasn't addressed yet
2. **Surface doubts** — catch logical inconsistencies, missing constraints, or risky assumptions in what the user HAS said
3. **Bring improvements and recommendations** — based on your intelligence if you can recommend any better solution or an improvement or enhancement over a feature, do bring these points to the user's notice

---

## Global Rules (Always Apply)

These constraints must be baked into the final prompt without asking the user — they're standing preferences:

1. **Mobile-first responsive UI** — all interfaces must be fully responsive
2. **Mono-repo** — front-end and back-end must live in one repository (no split repos)
3. **Avoid unnecessary build steps** — prefer technologies that can run without a build pipeline; if a build is unavoidable, proceed but justify it
4. **Production-grade from day one** — structure should support future scaling even if MVP is small
5. **README.md file** — ALWAYS create a README.md file where we will explain the code folder structure neatly and nicely
6. **Installation file** — ALWAYS create an INSTALLATION.md file where we will list down all the steps user is required to install and run the project on any machine
7. **MUST use all the latest packages** — ALWAYS check the latest package versions and only install the latest stable package versions whatever you find
8. **Optional Database Planning** — after covering all questions in all the layers, optionally ask the user if they want to plan the database as well now? If they say "no", go with your default database schema you recommend. If they say "yes", show them your planned database tables and their columns. Allow user to ask for modifications in the schema. Do not jump to next step until user is fully satisfied with the database schema. After every DB modification ask the user "Any more changes to do or we can lock this database schema?" and wait for user's answer before jumping to next question. Otherwise keep modifying the database tables and columns until the user is fully satisfied.
9 . **ALWAYS create an .env.example file** and also self-document each environment variable with properly formatted comments, all their possible values, and example values after the "=" sign. Also make sure all the values in .env.example file are within double quotes "". I don't want any sample value just added without double quotes. Double quotes are always safe approach in case the value contains some special characters that may break the proper reading of that variable by the application
10. **NEVER embed environment variables in MD files** - environment variables are very much dynamic and will change frequently as the application grows. As part of generating  README.md, INSTALLATION.md, DEPLOYMENT.md or any other md file, never embed current environment variables to document what they do. We self-document each environment variable in .env.example file already (refer to point 9 in this list), so no need to mention them in MD files.

---

## Coverage Layers

Every project prompt must eventually cover all relevant layers below. Not every layer applies to every project — use judgment — but you must consciously evaluate each one and either cover it or explicitly mark it as "N/A with reason."

| # | Layer | Key questions |
|---|-------|---------------|
| 1 | **Product Planning & Design** | What problem does it solve? Who are the users? What are the core user flows? Any wireframes or design references? |
| 2 | **Frontend (Client-side)** | Framework? UI component library? State management? Routing? SSR vs SPA vs SSG? |
| 3 | **Backend (Server-side)** | Language + framework? REST vs GraphQL vs tRPC? Monolith vs microservices? |
| 4 | **Database Layer** | SQL vs NoSQL? Which DB? ORM? Schema migrations? Seeding? |
| 5 | **API Communication** | REST, GraphQL, WebSockets, SSE? API versioning? Request/response format? |
| 6 | **Authentication & Security** | Auth strategy (JWT, session, OAuth, magic link)? Roles/permissions? 2FA? |
| 7 | **DevOps & Deployment** | Hosting platform? CI/CD? Containerization (Docker)? Env management? |
| 8 | **Testing** | Unit, integration, e2e? Which frameworks? Coverage targets? |
| 9 | **Performance Optimization** | Caching strategy? CDN? Lazy loading? Query optimization? |
| 10 | **Monitoring & Logging** | Error tracking? Uptime monitoring? Structured logs? Alerting? |
| 11 | **Background Jobs & Queues** | Async tasks? Scheduled jobs? Queue system (Bull, Celery, etc.)? |
| 12 | **Third-party Integrations** | Payments? Email/SMS? Maps? Analytics? Social login? |
| 13 | **Mobile Compatibility / Apps** | Web-only with responsive? Or native/hybrid apps needed? |
| 14 | **API Documentation** | Auto-generated (Swagger/OpenAPI)? Internal-only or public? |
| 15 | **Software Documentation** | README structure? Architecture docs? Onboarding guide? |
| 16 | **Security & Compliance** | GDPR? Data residency? Encryption at rest/transit? Secret management? |
| 17 | **Scalability & Architecture** | Expected load? Horizontal scaling? Multi-tenancy? Feature flags? |
| 18 | **Developer Experience** | Linting? Formatting? Git hooks? Commit conventions? |

---

## Iteration Process

### Round Structure

Each round must follow this format:

```
## Round [N] — [Short theme, e.g. "Core Architecture"]

### 🔍 Missing Details
[List gaps found — numbered, each with a DEFAULT RECOMMENDATION]

### ⚠️ Doubts & Inconsistencies
[List logical/technical issues found — numbered, each with a DEFAULT RECOMMENDATION]

### Recommendations, Enhancements and Improvements
[List possible improvements, enhancements and recommendations from your end on how to make that feature even better — numbered, each with a DEFAULT RECOMMENDATION]

---
Please answer the above, or just say "go with defaults" to accept all recommendations.
```

**Important rules for rounds:**
- Never dump ALL layers at once in Round 1. Start with the most critical unknowns.
- Each round should surface as many questions as possible, but maximum top 20 questions only.
- If the user says "go with defaults", accept all your own recommendations and move to the next round.
- Stop iterating when ALL layers are either covered or explicitly marked N/A, AND no unresolved doubts remain. But do not stop until you have even one single unanswered question you want clarification on beforehand.

### Default Recommendation Format

For every gap or doubt, always provide a recommendation like this:

> **Default:** [Your specific recommendation] — [1-line justification]

Example:
> **Default:** Use PostgreSQL via Supabase — managed hosting, excellent free tier, built-in auth, real-time subscriptions available if needed later.

---

## What to Look For (Technical Doubts Checklist)

When reviewing what the user has described, proactively flag:

- **Business Logic Conflict** — e.g., "You said the app can only be operated after logging in, but also mentioned somewhere that allow guest user access"
- **Data model conflicts** — e.g., "You said users can belong to multiple orgs, but also mentioned 'user profile' as singular — how does multi-tenancy affect the profile?"
- **Auth mismatches** — e.g., "You want social login AND magic links — what's the fallback if email delivery fails?"
- **Realtime vs polling** — e.g., "You want live updates — should this use WebSockets or is SSE/polling acceptable?"
- **Build step contradictions** — e.g., "You chose React + Vite, which requires a build step. Acceptable, or should we explore a no-build alternative like HTMX+Alpine?"
- **Scale assumptions** — e.g., "You mentioned 'thousands of concurrent users' but chose SQLite — is this intentional for MVP?"
- **Missing error states** — e.g., "What happens if a third-party payment API is down? Should there be a retry queue?"
- **File uploads** — often forgotten; if the app handles user content, ask about storage (S3, Cloudflare R2, etc.)
- **Email/notifications** — transactional emails are frequently missed until late in development
- **Soft delete vs hard delete** — data deletion strategy affects schema and compliance
- **Timezone handling** — often forgotten in apps with scheduling or multi-region users

---

## Final Output: The IDE Prompt

Once all rounds are complete and the user approves, generate the final prompt in this structure:

```
# Project: [Name]

## Overview
[2–3 sentence description of what this product does and who it's for]

## Global Constraints
- Mobile-first responsive UI (all pages/components)
- Mono-repo: frontend + backend in one repository
- [Build step note: avoid build / build is acceptable because X]
- Production-grade structure from the start

## Tech Stack
| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | ... | ... |
| Backend | ... | ... |
| Database | ... | ... |
| Auth | ... | ... |
| Hosting | ... | ... |
| ... | ... | ... |

## Repository Structure
[Suggested folder layout]

## Core Features & User Flows
[Numbered list of features with brief descriptions]

## Data Models
[Key entities and their relationships]

## API Design
[Key endpoints or schema outline]

## Authentication & Permissions
[Auth strategy + roles]

## Environment & Configuration
[Required env vars, secrets management approach]

## Testing Strategy
[What to test, which tools]

## Deployment
[How to run locally + deploy to production]

## Third-party Services
[List all external services with their purpose]

## Out of Scope (MVP)
[Explicitly list what is NOT being built now]

## Open Questions
[Any items the user deferred or marked for later]
```

The final prompt should be detailed enough that pasting it into Cursor/Windsurf's composer window gives the AI IDE enough context to scaffold the entire project structure correctly in one shot.

---

## Starting the Session

When the skill is triggered, begin with:

1. Ask the user to describe their project idea in their own words (free-form, no structure needed)
2. Then immediately begin **Round 1** based on what they said

Do NOT present the full layers table to the user — use it as your internal checklist only.
