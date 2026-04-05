# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Development with hot reload — Express server + Queue worker (NODE_ENV=development)
pnpm dev:local        # Same but without NODE_ENV override
pnpm build            # Compile TypeScript → dist/
pnpm start            # Production: compiled app + Queue worker concurrently
pnpm lint             # ESLint check
pnpm gen:imports      # Regenerate src/gen-import.ts from all module exports
```

### Testing

Two separate test runners coexist:

```bash
pnpm test             # Jest — unit tests (--runInBand, --detectOpenHandles)
pnpm test:local       # Jest — unit tests in development mode

pnpm test:e2e         # Vitest — e2e/endpoint tests (run once)
pnpm test:e2e:watch   # Vitest — e2e tests in watch mode
```

Run a single Vitest file:
```bash
pnpm test:e2e -- src/Module/Authentication/__tests__/auth.endpoint.test.ts
```

Run a single Jest file:
```bash
pnpm test -- --testPathPattern=src/path/to/test
```

E2E tests use Vitest + Supertest. The test helper `src/__tests__/helpers/test-app.ts` builds an isolated Express app (no DB, no server) via `createTestApp()`. Tests live in `__tests__/` directories co-located with the module they test.

Environment: copy `.env.example` to `.env` and fill in values before running.

## Architecture

**Gosha** is a pure AI agent engine that optimizes raw user text into structured prompts for LLMs. It runs entirely server-side with no external AI API calls — using a MongoDB-backed rule engine with learned weights.

### Core 5-Phase Processing Loop

1. **ANALYZE** — Tokenizer + Classifier (categories: coding/writing/analysis/marketing/general) + Gap Scorer (1–10)
2. **LEARN** — MongoDB similarity search + weight loader for rule personalization
3. **TRANSFORM** — 7 rules sorted by learned weight + model adapters (Claude XML, GPT markdown)
4. **MERGE & SCORE** — Borrow structure from high-scoring similar past prompts
5. **RECORD & FEEDBACK** — Save to history; adjust rule weights on user rating

### Agent Engine Implementation Status

**Currently wired (Phase 1 only):** `AgentService.analyze()` in `Module/agent/Service/based-agent.service.ts` runs tokenize → classify → assessComplexity → extractIntent → detect → calcRawScore and returns an `AnalysisResult`. Phases 2–5 engine components exist in `src/agent/script/` but are **not yet called by the service**.

Engine scripts available but not yet integrated:
- `rule-engine.ts` — `RuleEngine` class: sorts 7 rules by learned weight, applies matching ones
- `merger.ts` — `Merger` class: borrows XML/markdown/bracket sections from high-scoring past prompts that are absent in the current output
- `gap-scorer.ts` — `detect()` + `calcRawScore()`: scores 6 elements (task=2.5, context=2.0, role/constraints/outputFormat=1.5, examples=1.0) on a 1–10 scale
- `learner.ts` — `Learner` class: 3 paths — READ (`findSimilar` MongoDB text search, `getWeights`), WRITE (`recordResult` saves to `prompt_history` + increments rule usage), FEEDBACK (`applyFeedback` boosts/penalizes rule weights). Also `initWeights` for seeding (idempotent, called on startup)

### 7 Built-in Transformation Rules

`add_role`, `add_context`, `structure_task`, `add_constraints`, `add_output_format`, `improve_specificity`, `add_quality_markers`

**Learning:** Rule weights (0.2–3.0, default 1.0):
- Score ≥7 → +0.1; Score <5 → −0.05; Weekly decay ×0.95

### Tech Stack

| Layer | Technology |
|---|---|
| Runtime/Framework | Node.js + Express v5 |
| Language | TypeScript (strict, extends `@mohamed-elrefai/tsconfigs`) |
| Database | MongoDB 6+ (Mongoose), Redis |
| Auth | PASETO v4 tokens (`paseto` lib), bcryptjs |
| Validation | Zod (schema-based DTOs) |
| Logging | Pino (pretty in dev, JSON in prod) |
| Metrics | Prometheus via `prom-client` (exposed at `GET /metrics`) |
| Queue | BullMQ (email jobs via Redis) |
| Payments | Stripe + Paymob |
| File uploads | Cloudinary |

### Startup Order

`app.ts` must import in this exact order:

```
config/dotenv   →   process error handlers   →   express + app modules
```

`dotenv` must be the very first import so env vars are available before any config or module is loaded.

### Module Pattern

Every feature module follows this exact structure:

```
Module/FeatureName/
  feature.module.ts         # Express Router — applies validateDTO then wires controllers
  feature.controller.ts     # Barrel re-exporting all controllers in Controller/
  DTO/index.dto.ts          # Zod schemas — export both the schema and its inferred type (same name)
  @types/index.d.ts         # TypeScript interfaces for this module's domain models
  Controller/
    action.controller.ts    # One file per endpoint — single exported RequestHandler
  Service/
    based-feature.service.ts
  Schema/
    model.schema.ts         # Mongoose schema + model export
  middleware/               # Optional — module-specific middleware (e.g. profileMiddleware)
  __tests__/                # Vitest e2e tests for this module
```

Register in `app.module.ts`:
```typescript
app.use('/api/v1/feature', featureRouter)
```

`app.module.ts` is the single file that mounts all routers onto the Express app — it is the only place `app.use('/api/v1/...')` calls should appear.

### Agent Engine Layout

The prompt engine is split across two directories:

- `src/agent/` — pure engine logic: `tokenizer.ts`, `classifier.ts`, `gap-scorer.ts`, `rule-engine.ts`, `modelAdapter.ts`, and their data files. No Express dependency. Unit-tested with Jest.
- `src/Module/agent/` — HTTP wrapper: controller, DTO, service, and Vitest e2e tests. The service imports from `src/agent/` scripts.

When adding engine logic, put it in `src/agent/`; only the request/response boundary belongs in `src/Module/agent/`.

### `gen-import.ts` Convention

`src/gen-import.ts` is the **single barrel file** for all cross-module imports. Never import directly across module boundaries — always import from `@/gen-import`. It is auto-generated by `pnpm gen:imports`. Run that command after adding any new export anywhere in `src/`.

### asyncHandler and Express v5

`asyncHandler` in `src/utils/api-requesthandler.ts` does **not** contain a try/catch — it relies on Express v5's built-in async error propagation. Controllers must call `next(AppError.xxx)` for application errors or simply throw an `AppError` and Express v5 will forward it to `errorHandler`.

### Auth Token Flow

`token_PASETO(payload, type, expiresIn?)` in `paseto.utils.ts`:

| Type | Env Key | TTL |
|---|---|---|
| `access` | `ACCESS_PRIVATE_KEY` | 2h |
| `refresh` | `REFRESH_PRIVATE_KEY` | 30d |
| `forget_password` | `PRIVATE_FORGET_PASSWORD_SECRET_KY` | 2h |

Tokens are delivered as `httpOnly`, `secure`, `sameSite: 'strict'` cookies. `access_token` maxAge = 7_200_000 ms, `refresh_token` maxAge = 2_592_000_000 ms.

**Verification:** Two auth middlewares exist — use the right one:
- `profileMiddleware` (`Module/User/middleware/profile.middleware.ts`) — fetches the full user document (excluding password). Use on routes that need full profile data.
- `userMiddleware` (`src/middleware/user.middleware.ts`) — fetches only `{ _id: 1 }`. Use on routes that only need to confirm identity.

Both read `Authorization: Bearer <token>` and verify against `ACCESS_PUBLICE_KEY` (note: env var has a typo — `PUBLICE` not `PUBLIC`).

### Password Hashing

Passwords are hashed in the Mongoose `pre('save')` hook in `user.schema.ts` using bcrypt (salt rounds = 10). **Never hash manually in the service** — the schema hook handles it. Use `userDocument.comparePassword(candidate)` for verification.

### User Schema Key Fields

`IUser` fields relevant to the prompt engine and billing:
- `apiKey` — auto-generated UUID v4, unique index, used for API access
- `plan` — `'free' | 'starter' | 'pro' | 'enterprise'`, default `'free'`
- `tokens` — `{ used: number, limit: number, lastResetAt: Date }` — daily token ledger, limit enforced per plan

### Request Augmentation

`app.config.ts` attaches to every `req`:
- `req.lang` — `'en'` or `'ar'` from `Accept-Language` header
- `req.mobileApp` — from `app` header
- `req.clientIP` — resolved from Cloudflare → `x-real-ip` → `x-forwarded-for` → socket

### Socket.IO

`src/socket.ts` initializes Socket.IO against the `http.Server` exported from `app.ts`. A `/notification` namespace is created and exposed via `getNotificationNamespace()`. The `ioSocket` instance is exported from `app.ts` — import it there, never re-create it.

```typescript
import { getNotificationNamespace } from '@/socket'
```

The notification handler is stubbed (`notifiactionSocket` is commented out). Wire real handlers inside `socketFunction()`.

### MessageQueue

`src/MessageQueue/` contains a BullMQ worker for async email jobs. It runs as a separate process alongside the Express server (`pnpm dev` / `pnpm start` use `concurrently` to run both). Queue jobs are defined under `src/MessageQueue/jobs/`. Do not add synchronous email logic in controllers — always enqueue via the queue interface.

### Swagger / API Docs

Auth and User modules have dedicated `swagger.ts` files co-located with the module. These are wired into the app and serve interactive docs. Follow this pattern when adding new modules.

### Static Files

`/v0/public/*` is served from the `cdn/` directory at the project root via `express.static`.

### Implemented Schemas (not yet wired to routes)

| Model | Collection | Location |
|---|---|---|
| `PromptHistoryModel` | `prompt_history` | `Module/prompt/Schema/prompt.schema.ts` |
| `PlansModel` | `plans` | `Module/subscription/Schema/plans.schema.ts` |
| `TemplateModel` | `templates` | `Module/template/Schema/template.schema.ts` |
| `TokenLedgerModel` | `token_ledger` | `Module/subscription/Schema/TokenLedger.schema.ts` |
| `PaymentHistoryModel` | `payment_history` | `Module/subscription/Schema/payment.history.schema.ts` |

Currently mounted in `app.module.ts`:
- `/api/v1/auth` — Authentication module (register, login, refresh, logout, Google OAuth, forget/reset password)
- `/api/v1/users` — User profile module (requires `profileMiddleware`)
- `/api/v1/agent` — Agent analysis module (`POST /analyze`)

### Notification Module

`Module/Notifications/` provides real-time notifications via SSE (Server-Sent Events) backed by Redis pub/sub. Clients register via `GET /stream` (SSE connection) and services publish via `POST /publish`. The module uses `sseFormat.ts` for event formatting. Not yet mounted in `app.module.ts`.

Prompt, subscription, and template modules have schemas defined but are not yet registered in `app.module.ts`.

### Planned API Routes

- `POST /api/prompts/optimize` — Core engine endpoint
- `GET /api/prompts/history` — Paginated history
- `PATCH /api/prompts/:id/rate` — Feedback that drives weight learning
- `POST /api/webhooks/stripe` — Stripe webhook

### Subscription Tiers

Free ($0) → Starter ($9/mo) → Pro ($29/mo) → Enterprise ($99/mo), differentiated by daily tokens (10/50/500/5000) and rate limits.

**Token costs:** ≤50 words = 1, 51–200 = 3, 200+ = 5, cache hit = 0.

## Hard Rules

- **Never read, edit, or write any `.env` file** (`.env`, `.env.dev`, `.env.local`, `.env.production`, or any `.env*` variant). These files contain secrets. Use `.env.example` to understand required variables.

## Key Conventions

- Import across modules only via `@/gen-import`; run `pnpm gen:imports` after any new export.
- `createLogger("ServiceName")` in every service and module file.
- `authlimiter` on auth routes; global `limiter` is applied in `app.config.ts` — do not re-apply.
- `paginate<T>(model, filter, options)` for all paginated queries — max limit is clamped to 100.
- `validateDTO(ZodSchema)` middleware must precede every controller that reads `req.body`. Pass the Zod schema (e.g. `validateDTO(RegisterDTO)`), not a class.
- `AppError` static factories for all thrown errors — never `new Error()` in controllers or services.
- TypeScript build excludes test files (`tsconfig.build.json`); tests use `tsconfig.test.json`.
- PNPM workspace uses dependency catalogs in `pnpm-workspace.yaml` — add new deps to the catalog, not inline in `package.json`.
