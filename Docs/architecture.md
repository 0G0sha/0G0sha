# Gosha — Backend Architecture

> Pure AI agent engine. No external AI API calls. Self-learning rule-based prompt optimizer.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Directory Structure](#2-directory-structure)
3. [Startup & Bootstrap](#3-startup--bootstrap)
4. [Middleware Pipeline](#4-middleware-pipeline)
5. [Module Pattern](#5-module-pattern)
6. [Authentication System](#6-authentication-system)
7. [Database Layer](#7-database-layer)
8. [Caching Layer (Redis)](#8-caching-layer-redis)
9. [Message Queue (BullMQ)](#9-message-queue-bullmq)
10. [Error Handling](#10-error-handling)
11. [Logging & Observability](#11-logging--observability)
12. [File Uploads (Cloudinary)](#12-file-uploads-cloudinary)
13. [Rate Limiting](#13-rate-limiting)
14. [Validation (DTO Pattern)](#14-validation-dto-pattern)
15. [Pagination](#15-pagination)
16. [The Agent Engine (Core — Planned)](#16-the-agent-engine-core--planned)
17. [API Reference](#17-api-reference)
18. [Environment Variables](#18-environment-variables)
19. [Tech Stack](#19-tech-stack)

---

## 1. System Overview

```
Client Request
     │
     ▼
┌─────────────────────────────────────────────────────┐
│  Express v5 Server (Port 9999)                      │
│                                                     │
│  Middleware Pipeline                                │
│  Helmet → CORS → Body Parser → Rate Limit →         │
│  Morgan → Prometheus → Request Augmentation         │
│                                                     │
│  Router (app.module.ts)                             │
│  /api/v1/auth     → Authentication Module           │
│  /api/prompts     → Prompt Engine (planned)         │
│  /api-docs        → Swagger UI                      │
│  /metrics         → Prometheus Metrics              │
│                                                     │
└─────────────────────────────────────────────────────┘
     │
     ├── MongoDB (Mongoose 9)   — persistent data
     ├── Redis                  — cache + job queue
     └── BullMQ                 — email job processing
```

Gosha processes raw user text through a **5-phase loop** using a **pure rule engine** — no external AI API is ever called:

```
Raw text → ANALYZE → LEARN → TRANSFORM → MERGE & SCORE → RECORD & FEEDBACK
               │         │         │              │
           Classifier  MongoDB  7 Rules       Save to DB
           + Gap Score  search   by weight    Adjust weights
```

---

## 2. Directory Structure

```
src/
├── app.ts                    # Entry point — DB/Redis connect, server start
├── app.config.ts             # Middleware pipeline
├── app.module.ts             # Route mounting
├── swagger.ts                # OpenAPI/Swagger setup
├── gen-import.ts             # AUTO-GENERATED barrel (run: pnpm gen:imports)
│
├── config/
│   ├── dotenv.ts             # .env / .env.dev loader
│   ├── mongoDB.ts            # Mongoose + 5-retry logic
│   ├── redis.ts              # Redis client (dual localhost/prod)
│   ├── cloudinary.ts         # Cloudinary v2 init
│   └── index.ts              # Re-exports all configs
│
├── middleware/
│   └── validateDTO.ts        # Generic DTO validation (Zod)
│
├── utils/
│   ├── logger.ts             # Pino logger factory (createLogger)
│   ├── limit-request.ts      # limiter + authlimiter
│   ├── pagination.ts         # paginate<T>() generic utility
│   ├── api-requesthandler.ts # asyncHandler() — catches Promise rejections
│   └── hashText.ts           # SHA256 text hasher (normalize → hash)
│
├── Shared/
│   ├── errors/
│   │   ├── app-error.ts      # AppError class + static factories
│   │   └── errorHandler.ts   # Central Express error middleware
│   └── enum/
│       └── index.ts          # Shared enums (USER_PLAN, TOKEN_LEDGER_ACTION,
│                             #   PLAN_PROVIDER, PAYMENT_STATUS, PAYMENT_METHOD)
│
├── Providers/
│   └── cloudinary.provider.ts  # multer upload + uploadToCloudinary()
│
├── MessageQueue/
│   ├── Queue/queue.email.ts  # BullMQ queue + addJobToQueue()
│   ├── jobs/job.process.emails.ts  # sendEmail job processor
│   ├── worker.emails.ts      # BullMQ worker
│   └── index.ts              # Worker entrypoint (standalone process)
│
├── agent/                    # Pure agent-engine types (no DB dependency)
│   └── @types/index.d.ts     # TargetModel, PromptCategory, PromptComplexity,
│                             #   Token, PromptGap, AnalysisResult, TransformRule,
│                             #   LearnedWeight, SimilarPrompt, AgentInput, AgentOutput
│
├── Module/
│   ├── Authentication/       # Auth module (all endpoints implemented)
│   ├── User/                 # User schema, service, controller, DTO, middleware
│   ├── agent/                # Agent module — LearnedWeight schema + types
│   │   ├── @types/index.d.ts # ILearnedWeight interface
│   │   └── Schema/learned.weight.schema.ts  # LearnedWeightModel
│   ├── prompt/               # Prompt history module
│   │   ├── @types/index.d.ts # IPromptHistory interface
│   │   └── Schema/prompt.schema.ts          # PromptHistoryModel
│   ├── subscription/         # Subscription / billing module
│   │   ├── @types/index.d.ts # IPlan, ITokenLedger, IPaymentHistory interfaces
│   │   └── Schema/
│   │       ├── plans.schema.ts              # PlanModel
│   │       ├── TokenLedger.schema.ts        # TokenLedgerModel (90-day TTL)
│   │       └── payment.history.schema.ts    # PaymentHistoryModel
│   └── template/             # Prompt template module
│       ├── @types/index.d.ts # ITemplate interface
│       └── Schema/template.schema.ts        # TemplateModel
│
├── __tests__/
│   └── helpers/test-app.ts   # createTestApp() — isolated Express app for e2e tests
│
├── @types/
│   └── index.d.ts            # Global interfaces (Pagination, IUserRequest)
└── types/
    └── express/index.d.ts    # Express Request augmentation
```

---

## 3. Startup & Bootstrap

**`src/app.ts`** — process entry point.

```
Process Start
     │
     ├── Register global error handlers
     │       unhandledRejection → log + exit(1)
     │       uncaughtException  → log + exit(1)
     │
     ├── connect MongoDB (5-retry with backoff)
     ├── connect Redis
     │
     └── Start Express server on PORT (default: 9999)
```

**`src/MessageQueue/index.ts`** — runs as a **separate process** via `concurrently`:
```
Connect MongoDB → Start BullMQ email worker
```

Both processes start together in development via `pnpm dev`.

---

## 4. Middleware Pipeline

Defined in **`src/app.config.ts`**, applied in this order:

| Order | Middleware | Purpose |
|-------|-----------|---------|
| 1 | `helmet()` | Security headers (CSP, HSTS, etc.) |
| 2 | `express.json()` | Parse JSON bodies |
| 3 | `express.urlencoded()` | Parse URL-encoded bodies |
| 4 | `cookieParser()` | Parse cookies |
| 5 | `cors()` | Cross-origin resource sharing |
| 6 | `limiter` | Global rate limit (350 req / 5 min) |
| 7 | `morgan` | HTTP request logging via Pino |
| 8 | Prometheus | Record HTTP metrics per route |
| 9 | Request augmentation | Attach `lang`, `mobileApp`, `clientIP` |

**Request augmentation** adds to every `req`:
- `req.lang` — `'en'` or `'ar'` from `Accept-Language` header
- `req.mobileApp` — `'app'` if `app` header equals `'app'`
- `req.clientIP` — resolved from Cloudflare/proxy headers (`cf-connecting-ip`, `x-forwarded-for`)

---

## 5. Module Pattern

Every feature module follows the same 5-layer structure:

```
Module/
└── FeatureName/
    ├── feature.module.ts         # Express Router — route definitions + middleware chain
    ├── feature.controller.ts     # Barrel re-export
    ├── DTO/
    │   └── index.dto.ts          # class-validator decorated class per operation
    ├── Controller/
    │   └── action.controller.ts  # Single exported RequestHandler using asyncHandler()
    ├── Service/
    │   └── feature.service.ts    # Business logic class
    └── index.ts                  # Re-exports module router
```

**Route wiring example:**

```typescript
// feature.module.ts
router.post('/route', authlimiter, validateDTO(CreateDTO), createController);

// app.module.ts
app.use('/api/v1/feature', feature_module);
```

`validateDTO` accepts a **Zod schema** (not a class). The middleware calls `schema.safeParse(req.body)` and forwards field-level error messages to `AppError.badRequest()` on failure.

**Import convention:** Never import directly across modules. Always use the auto-generated barrel:

```typescript
// Correct
import { UserModel, AppError, asyncHandler } from '@/gen-import';

// Wrong — never do this
import { UserModel } from '../User/Schema/user.schema';
```

After adding new exports anywhere in `src/`, run:
```bash
pnpm gen:imports   # regenerates src/gen-import.ts
```

---

## 6. Authentication System

### Token Strategy: PASETO v4

Gosha uses **PASETO v4** (public-key crypto) instead of JWT. Tokens are asymmetrically signed and cannot be forged without the private key.

```
token_PASETO(payload, type, expiresIn?)
     │
     ├── 'access'          → ACCESS_PRIVATE_KEY,  TTL: 2h
     ├── 'refresh'         → REFRESH_PRIVATE_KEY, TTL: 30d
     └── 'forget_password' → REFRESH_PRIVATE_KEY, TTL: 2h
```

**Token payload structure:**
```typescript
{
  user_id:       string,
  site:          "0Gosha",
  token_version: 2,
  access_device: string
}
```

### Cookie Delivery

Tokens are set as **httpOnly cookies** — never exposed to JavaScript:

```
access_token  cookie: httpOnly, secure, sameSite=strict, maxAge=2h
refresh_token cookie: httpOnly, secure, sameSite=strict, maxAge=30d
```

### Registration Flow

```
POST /api/v1/auth/register
     │
     ├── authlimiter (5 req / 2 min)
     ├── validateDTO(RegisterDTO)
     │       name: min 2 chars
     │       email: valid, max 100 chars
     │       password: 8–64 chars, 1 upper, 1 lower, 1 digit, 1 special
     │
     └── registerController
             │
             ├── BasedAuthService.check_account(email)
             │       → 409 Conflict if email exists
             │
             ├── BasedAuthService.create_account(dto)
             │       → hash password (bcrypt, 12 rounds)
             │       → create UserModel
             │       → generate access + refresh tokens
             │
             └── Set httpOnly cookies → 201 Created
```

### Auth Endpoints

| Method | Route | Status |
|--------|-------|--------|
| POST | `/api/v1/auth/register` | ✓ Complete |
| POST | `/api/v1/auth/login` | ✓ Complete |
| POST | `/api/v1/auth/refresh` | ✓ Complete |
| POST | `/api/v1/auth/logout` | ✓ Complete |
| POST | `/api/v1/auth/forget-password` | ✓ Complete |
| POST | `/api/v1/auth/reset-password` | ✓ Complete |
| POST | `/api/v1/auth/google` | ✓ Complete (Google OAuth token exchange) |
| GET | `/api/v1/auth/google/callback` | Planned |

---

## 7. Database Layer

**MongoDB 6+ via Mongoose 9**

### Connection (`src/config/mongoDB.ts`)

- Retry logic: up to **5 attempts** with exponential backoff
- Logs local IP on successful connection
- Listens for `disconnected` and `error` events

### User Schema (`src/Module/User/Schema/user.schema.ts`)

| Field | Type | Notes |
|-------|------|-------|
| `fullname` | String | Required |
| `username` | String | Default `''` |
| `email` | String | Unique index, lowercase, trim |
| `password` | String | bcrypt hashed in pre-save hook (salt rounds = 10) |
| `avatar` | String | Cloudinary URL |
| `apiKey` | String | UUID v4, unique index |
| `googleId` | String | Google OAuth ID, default `''` |
| `plan` | Enum | `free` \| `starter` \| `pro` \| `enterprise` (via `USER_PLAN` enum) |
| `tokens` | Object | `{used, limit, lastResetAt}` — default limit: 10 |
| `subscription` | ObjectId | Ref: Subscription |

**Instance method:** `comparePassword(candidate)` → `bcrypt.compare()`

### Implemented Collections

All collections are now scaffolded with Mongoose schemas:

| Collection | Model | Key Fields |
|-----------|-------|-----------|
| `prompt_history` | `PromptHistoryModel` | `originalText`, `optimizedText`, `targetModel`, `category`, `rulesApplied`, `score`, `userScore`, `userId`, `keywords`, `tokensCost` — text index on `originalText + keywords` |
| `learned_weight` | `LearnedWeightModel` | `ruleId`, `category`, `weight`, `totalUses`, `totalScore`, `avgScore` — unique index on `(ruleId, category)` |
| `Plan` | `PlanModel` | `name`, `displayName`, `price`, `tokensPerDay`, `features`, `limits`, `isActive` |
| `Template` | `TemplateModel` | `name`, `category`, `description`, `systemPrompt`, `exampleInput`, `exampleOutput`, `isActive` |
| `TokenLedger` | `TokenLedgerModel` | `userId`, `amount`, `action` (optimize/reset/bonus/refund), `promptId`, `balanceAfter`, `metadata` — 90-day TTL index |
| `PaymentHistory` | `PaymentHistoryModel` | `userId`, `planId`, `order_id`, `amount`, `currency`, `status`, `provider` (stripe/paymob), `method` (card/wallet), `transaction_id`, `expiresAt` |

---

## 8. Caching Layer (Redis)

**`src/config/redis.ts`**

- Dual mode: `localhost:6379` in dev, production URL from `REDIS_URL` env
- Reconnect strategy: retry every 500ms, gives up after 10 attempts
- SIGTERM handler disconnects cleanly
- Exported as `redis` (default) and `redisConfig` (connection options)

Used by:
- BullMQ job queues (dedicated connection per queue/worker)
- Rate limiting backing store (planned)
- Session caching (planned)

---

## 9. Message Queue (BullMQ)

Runs as a **separate process** (`src/MessageQueue/index.ts`).

```
addJobToQueue('sendEmail', { to, subject, html })
     │
     └── emailQueue (BullMQ)
              │
              └── BullMQ Worker
                       │
                       └── jobProcessor(job)
                                │
                                └── sendEmail(job.data)
                                    (SMTP / SES — stub, not yet implemented)
```

**Queue config:**
- Completed jobs removed after **1 hour**
- Failed jobs retained for **24 hours**
- Worker concurrency: default (1 per CPU)

**Job lifecycle events:**
- `completed` → update progress to 100%
- `failed` → log error with job data

---

## 10. Error Handling

### AppError (`src/Shared/errors/app-error.ts`)

All errors thrown inside route handlers use `AppError` static factories:

```typescript
throw AppError.badRequest('Email is required');      // 400
throw AppError.unauthorized('Token expired');         // 401
throw AppError.notFound('User not found');            // 404
throw AppError.conflict('Email already exists');      // 409
throw AppError.tooMany('Rate limit exceeded');        // 429
throw AppError.internal('Unexpected failure');        // 500
```

### Central Error Middleware (`src/Shared/errors/errorHandler.ts`)

Catches all errors at the Express level and formats consistent JSON responses:

```typescript
// Handles:
// AppError          → structured { status, message }
// Mongoose ValidationError → 400 with field details
// MongoServerError 11000   → 409 Conflict (duplicate key)
// Unknown errors           → 500 Internal Server Error
```

### asyncHandler Wrapper

Every controller is wrapped to catch unhandled Promise rejections:

```typescript
export const myController = asyncHandler(async (req, res) => {
  // any thrown error goes to errorHandler middleware
});
```

---

## 11. Logging & Observability

### Pino Logger (`src/utils/logger.ts`)

```typescript
const logger = createLogger('ServiceName');
logger.info({ userId }, 'User registered');
logger.error({ err }, 'Failed to connect');
```

**Environments:**
- **Dev:** pretty-printed to stdout + debug level
- **Prod:** JSON to stdout + file at `logs/app.log`

**Redacted fields** (never logged):
`authorization`, `cookie`, `password`, `token`, `secret`, `key`

### Prometheus Metrics (`src/app.config.ts`)

- Exposed at `GET /metrics`
- Tracks: HTTP request duration, status codes, route labels
- Compatible with Grafana + Prometheus scraping

### Morgan HTTP Logging

- Integrated with Pino transport
- Logs every request: method, path, status, response time

---

## 12. File Uploads (Cloudinary)

**`src/Providers/cloudinary.provider.ts`**

```typescript
// Middleware — adds req.file (memoryStorage, no disk write)
router.post('/upload', upload.single('image'), controller);

// Utility — stream buffer to Cloudinary
const result = await uploadToCloudinary(req.file.buffer, {
  folder: 'avatars',
  transformation: { width: 400, height: 400, crop: 'fill' }
});
// result.secure_url → store in DB
```

---

## 13. Rate Limiting

**`src/utils/limit-request.ts`**

| Limiter | Limit | Window | Applied To |
|---------|-------|--------|-----------|
| `limiter` | 350 requests | 5 minutes | All routes (global) |
| `authlimiter` | 5 requests | 2 minutes | Auth routes only |

`authlimiter` uses `skipSuccessfulRequests: true` — only counts failed attempts toward the limit. This prevents legitimate users from being locked out while still throttling brute-force attacks.

Rate limit key: `clientIP` (resolved from Cloudflare/proxy headers).

---

## 14. Validation (DTO Pattern)

**`src/middleware/validateDTO.ts`**

Schema-based validation using **Zod**. Each DTO exports both the Zod schema and its inferred TypeScript type under the same name:

```typescript
// DTO definition (src/Module/Feature/DTO/index.dto.ts)
export const RegisterDTO = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email().max(100),
  password: z.string().min(8).max(64)
    .regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^a-zA-Z0-9]/),
});
export type RegisterDTO = z.infer<typeof RegisterDTO>;

// Route wiring — pass the Zod schema, not a class
router.post('/register', validateDTO(RegisterDTO), registerController);
```

`validateDTO` calls `schema.safeParse(req.body)`, joins all `error.errors` messages with `'; '`, and passes them to `AppError.badRequest()` on failure. On success it replaces `req.body` with the parsed (typed) data.

---

## 15. Pagination

**`src/utils/pagination.ts`**

Generic Mongoose pagination utility:

```typescript
const result = await paginate(UserModel, { plan: 'pro' }, {
  page: 1,
  limit: 20,
  sort: { createdAt: -1 }
});

// Returns:
{
  data: User[],
  meta: {
    total: 142,
    page: 1,
    limit: 20,
    totalPages: 8,
    hasNext: true,
    hasPrev: false
  }
}
```

- **Max limit clamped to 100** — prevents unbounded queries
- Works with any Mongoose model and filter

---

## 16. The Agent Engine (Core — In Progress)

The core value proposition of Gosha. No external AI involved.

### Type System (`src/agent/@types/index.d.ts`)

All agent-engine types are defined and ready:

```typescript
// Input/output contracts
type AgentInput  = { text: string; targetModel: TargetModel; userId?: string }
type AgentOutput = { promptId: string; original: string; optimized: string;
                     score: number; suggestions: string[]; analysis: AnalysisResult }

// Classification types
type TargetModel      = 'claude' | 'gpt' | 'general'
type PromptCategory   = 'coding' | 'writing' | 'analysis' | 'marketing' | 'general'
type PromptComplexity = 'simple' | 'medium' | 'complex'
type PromptElement    = 'role' | 'context' | 'task' | 'constraints' | 'outputFormat' | 'examples'

// Analysis types
type Token        = { word: string; isKeyword: boolean; weight: number }
type PromptGap    = { element: PromptElement; severity: 'missing' | 'weak' | 'ok' }
type AnalysisResult = { tokens, keywords, category, complexity, intent, gaps, rawScore }

// Rule engine types
type TransformRule  = { id, name, element, condition(text): boolean, apply(text): string }
type LearnedWeight  = { ruleId, category, weight, totalUses, avgScore }
type SimilarPrompt  = { originalText, optimizedText, score, category, rulesApplied, similarity }
```

### Phase 3 Plan (`Docs/phase-3.md`)

The Analyzer is the next component to be implemented:

```
src/agent/
├── tokenizer.ts    # Text → Token[] + keyword extraction
├── classifier.ts   # Token[] → category + complexity + intent
└── gap-scorer.ts   # Regex pattern matching → PromptGap[] + rawScore
```

See `Docs/phase-3.md` for detailed implementation plan including word sets, regex patterns, scoring formulas, and test cases.

### 5-Phase Processing Loop

```
Phase 1: ANALYZE
  ├── Tokenizer — split + normalize input
  ├── Classifier — category: coding | writing | analysis | marketing | general
  └── Gap Scorer — score 1–10 (how much improvement the prompt needs)

Phase 2: LEARN
  ├── MongoDB similarity search on prompt_history
  └── Load learned_weights for this category from DB

Phase 3: TRANSFORM
  ├── 7 rules sorted by learned weight (highest first)
  ├── Rules: add_role, add_context, structure_task, add_constraints,
  │          add_output_format, improve_specificity, add_quality_markers
  └── Model adapters: Claude (XML tags) | GPT (markdown) | general

Phase 4: MERGE & SCORE
  └── Borrow structure from high-scoring similar past prompts

Phase 5: RECORD & FEEDBACK
  ├── Save optimization to prompt_history
  └── On user rating:
        score ≥ 7 → weight + 0.1
        score < 5 → weight − 0.05
        weekly   → weight × 0.95 (decay)
```

### Rule Weight System

```
Initial weight: 1.0 per rule
Range: 0.2 – 3.0
Scope: per category (coding weights differ from writing weights)
Storage: learned_weights collection in MongoDB
```

### Planned API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/prompts/optimize` | Core optimization endpoint |
| GET | `/api/prompts/history` | Paginated history (`?page=1&limit=20`) |
| GET | `/api/prompts/:id` | Single optimization details |
| PATCH | `/api/prompts/:id/rate` | Submit rating → triggers weight update |

---

## 17. API Reference

### Current Endpoints

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/v1/auth/register` | None | Create account |
| POST | `/api/v1/auth/login` | None | Login, set tokens |
| POST | `/api/v1/auth/refresh` | Cookie | Refresh access token |
| POST | `/api/v1/auth/logout` | Cookie | Clear token cookies |
| POST | `/api/v1/auth/google` | None | Google OAuth token exchange |
| POST | `/api/v1/auth/forget-password` | None | Send password reset token |
| POST | `/api/v1/auth/reset-password` | None | Reset password with token |
| GET | `/api-docs` | None | Swagger UI |
| GET | `/metrics` | None | Prometheus metrics |

### Token Costs (Planned)

| Input Length | Token Cost |
|-------------|-----------|
| ≤ 50 words | 1 token |
| 51–200 words | 3 tokens |
| 200+ words | 5 tokens |
| Cache hit | 0 tokens |

### Subscription Tiers (Planned)

| Plan | Price | Daily Tokens | Rate Limit |
|------|-------|-------------|-----------|
| Free | $0 | 10 | Standard |
| Starter | $9/mo | 50 | 2× |
| Pro | $29/mo | 500 | 10× |
| Enterprise | $99/mo | 5,000 | 50× |

---

## 18. Environment Variables

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` \| `production` |
| `PORT` | Server port (default: 9999) |
| `MONGO_URI` | MongoDB connection string |
| `REDIS_URL` | Redis connection URL (prod) |
| `ACCESS_PRIVATE_KEY` | PASETO v4 private key for access tokens |
| `REFRESH_PRIVATE_KEY` | PASETO v4 private key for refresh/reset tokens |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `PAYMOB_API_KEY` | Paymob API key |
| `PAYMOB_HMAC_SECRET` | Paymob HMAC secret |

Copy `.env.example` → `.env` and fill in all values before running.

---

## 19. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 22+ |
| Framework | Express | 5.2.1 |
| Language | TypeScript | 5.9.3 |
| Database | MongoDB + Mongoose | 9.3.1 |
| Cache | Redis | 5.11.0 |
| Auth | PASETO v4 (`paseto`) | 3.1.4 |
| Validation | Zod | 3.x |
| Logging | Pino | 9.7.0 |
| Metrics | Prometheus (`prom-client`) | 15.1.3 |
| Queue | BullMQ | 5.71.0 |
| File CDN | Cloudinary | 2.6.1 |
| File Upload | Multer | 2.0.0 |
| Security | Helmet | 8.1.0 |
| Rate Limiting | express-rate-limit | 8.3.1 |
| API Docs | swagger-jsdoc + swagger-ui-express | 6.2.8 / 5.0.1 |
| Testing | Vitest + Supertest | 3.2.0 / 7.0.0 |
| Package Manager | pnpm (workspace + catalogs) | — |
| Process Runner | concurrently + nodemon | — |

---

*Last updated: 2026-03-24*
