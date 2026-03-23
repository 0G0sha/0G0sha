# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Development with hot reload (Express + Queue worker concurrently)
pnpm build            # Compile TypeScript → dist/
pnpm start            # Production: run compiled app + Queue worker
pnpm test             # Jest (watch mode, open handles detection)
pnpm test:local       # Jest in development mode
pnpm lint             # ESLint check
pnpm gen:imports      # Regenerate src/the-import.d.ts from all module exports
```

Environment: copy `.env.example` to `.env` and fill in values before running.

## Architecture

**Gosha** is a pure AI agent engine that optimizes raw user text into structured prompts for LLMs. It runs entirely server-side with no external AI API calls — using a MongoDB-backed rule engine with learned weights.

### Core 5-Phase Processing Loop

1. **ANALYZE** — Tokenizer + Classifier (categories: coding/writing/analysis/marketing/general) + Gap Scorer (1–10)
2. **LEARN** — MongoDB similarity search + weight loader for rule personalization
3. **TRANSFORM** — 7 rule engine sorted by learned weight + model adapters (Claude XML, GPT markdown)
4. **MERGE & SCORE** — Borrow structure from high-scoring similar past prompts
5. **RECORD & FEEDBACK** — Save to history; adjust rule weights on user rating

### 7 Built-in Transformation Rules (sorted by weight at runtime)

`add_role`, `add_context`, `structure_task`, `add_constraints`, `add_output_format`, `improve_specificity`, `add_quality_markers`

**Learning:** Rule weights (0.2–3.0, default 1.0) adjust per rating:
- Score ≥7 → +0.1; Score <5 → −0.05; Weekly decay ×0.95

### Tech Stack

| Layer | Technology |
|---|---|
| Runtime/Framework | Node.js + Express v5 |
| Language | TypeScript (strict, extends `@mohamed-elrefai/tsconfigs`) |
| Database | MongoDB 6+ (Mongoose), Redis |
| Auth | PASETO v4 tokens (`paseto` lib), bcryptjs |
| Validation | `class-validator` + `class-transformer` (decorator-based DTOs) |
| Logging | Pino (pretty in dev, JSON in prod) with sensitive-field redaction |
| Metrics | Prometheus via `prom-client` |
| Queue | BullMQ (email jobs via Redis) |
| Payments | Stripe + Paymob |
| File uploads | Cloudinary |

### Source Layout

```
src/
  app.ts              # Entry point — connects DB/Redis, starts server
  app.config.ts       # Middleware pipeline (Helmet, CORS, rate limit, Prometheus, Morgan, useragent)
  app.module.ts       # Mounts all route modules onto the Express app
  the-import.d.ts     # AUTO-GENERATED barrel — run `pnpm gen:imports` to update
  swagger.ts          # Swagger/OpenAPI setup

  config/
    dotenv.ts         # Loads .env / .env.dev
    mongoDB.ts        # MongoDB connection with 5-retry logic
    redis.ts          # Redis client (dual localhost/prod mode), exports `redis` default + `redisConfig`
    cloudinary.ts     # Cloudinary SDK init
    index.ts          # Re-exports all configs

  middleware/
    validateDTO.ts    # Generic DTO validation middleware — uses class-validator + class-transformer

  utils/
    logger.ts         # createLogger(serviceName) → Pino instance; also exports root `logger`
    limit-request.ts  # Two rate limiters: `limiter` (general) and `authlimiter` (auth routes)
    pagination.ts     # paginate<T>(model, filter, options) — max limit clamped to 100
    api-requesthandler.ts  # asyncHandler() wrapper
    hashText.ts       # bcrypt helpers

  Shared/
    errors/
      app-error.ts    # AppError class with static factories: .badRequest, .unauthorized, .notFound, .conflict, .tooMany, .internal
      errorHandler.ts # Express error handler middleware

  Providers/
    cloudinary.provider.ts  # uploadToCloudinary(), multer `upload` middleware

  MessageQueue/
    Queue/queue.email.ts    # BullMQ queue + addJobToQueue()
    jobs/job.process.emails.ts  # sendEmail job processor
    worker.emails.ts        # BullMQ worker definition
    index.ts                # Worker entrypoint (connects MongoDB then starts workers)

  Module/
    Authentication/
      auth.module.ts        # Express Router — wires routes with validateDTO + controllers
      auth.controller.ts    # Re-exports controllers (barrel)
      DTO/index.dto.ts      # RegisterDTO with class-validator decorators
      Controller/           # One file per endpoint (register, login, logout, refresh, etc.)
      Service/
        based-auth.service.ts  # BasedAuthService: check_account, create_account, create_token
        0Auth.service.ts       # OauthService (Google OAuth)
      utils/paseto.utils.ts   # token_PASETO(payload, type, expiresIn?) — switch on 'access'|'refresh'|'forget_password'
    User/
      Schema/user.schema.ts   # Mongoose UserModel
      @types/index.d.ts       # IUser interface
```

### Module Pattern

Each feature module follows this structure:
1. `auth.module.ts` — Router, applies `validateDTO(DTO)` then controller per route
2. `DTO/index.dto.ts` — class-validator decorated class (one per operation)
3. `Controller/*.controller.ts` — single exported `RequestHandler` using `asyncHandler`
4. `Service/*.service.ts` — business logic class
5. Register the router in `app.module.ts` → `app.use('/api/v1/...', module)`

### `the-import.d.ts` Convention

`src/the-import.d.ts` is the **single barrel file** for all cross-module imports — never import directly across modules; always import from `@/the-import`. It is auto-generated by `pnpm gen:imports`. After adding a new export anywhere in `src/`, run that command to register it.

### Request Augmentation

`app.config.ts` attaches to every request:
- `req.lang` — `'en'` or `'ar'` from `Accept-Language` header
- `req.mobileApp` — from `app` header
- `req.clientIP` — resolved from Cloudflare / proxy headers

### Auth Token Flow

`token_PASETO(payload, type, expiresIn?)` in `paseto.utils.ts` handles all three token types via switch:
- `access` → env `ACCESS_PRIVATE_KEY`, 2h TTL
- `refresh` → env `REFRESH_PRIVATE_KEY`, 30d TTL
- `forget_password` → env `REFRESH_PRIVATE_KEY`, 2h TTL

Tokens + refresh are set as **httpOnly cookies** in the register controller.

### Planned Collections (not yet implemented)

`prompt_history`, `learned_weights`, `plans`, `templates`, `token_ledger` (90-day TTL), `payment_history`

### Planned API Routes

- `POST /api/prompts/optimize` — Core engine endpoint
- `GET /api/prompts/history` — Paginated history
- `PATCH /api/prompts/:id/rate` — Feedback that drives weight learning
- Stripe webhook: `POST /api/webhooks/stripe`

### Subscription Tiers

Free ($0) → Starter ($9/mo) → Pro ($29/mo) → Enterprise ($99/mo), differentiated by daily tokens (10/50/500/5000) and rate limits.

**Token costs:** ≤50 words = 1, 51–200 = 3, 200+ = 5, cache hit = 0.

### Key Conventions

- Always import from `@/the-import`; run `pnpm gen:imports` after adding new exports.
- Use `createLogger("ServiceName")` from `src/utils/logger.ts` in every service/module.
- Apply `authlimiter` on auth routes, `limiter` is applied globally in `app.config.ts`.
- Pagination via `paginate<T>(model, filter, options)` from `src/utils/pagination.ts`.
- Validate request bodies with `validateDTO(DTOClass)` middleware before controllers.
- TypeScript build excludes test files (`tsconfig.build.json`); tests use `tsconfig.test.json`.
- PNPM workspace uses dependency catalogs in `pnpm-workspace.yaml` — add new deps to the catalog, not inline in `package.json`.
- `reflect-metadata` must be imported before any decorator usage; it is imported at the top of `app.ts`.
