# Phase 1 — Setup & Infrastructure

**Duration:** 4 days
**Status:** ✅ Complete

---

## Overview

Phase 1 builds the foundation every other phase depends on. Nothing in 0Gosha works without this layer — config validation, data store connections, error handling, auth, rate limiting, logging, and shared utilities.

---

## Files Created (14 files)

```
0Gosha/
├── package.json                               → Dependencies + scripts
├── tsconfig.json                              → Strict TypeScript config
├── .env.example                               → All env vars template
├── .gitignore                                 → node_modules, dist, .env, *.pem
├── .dockerignore                              → Exclude non-build files from Docker
├── src/
│   ├── config/
│   │   ├── env.ts                             → Zod-validated env vars
│   │   ├── db.ts                              → MongoDB + Redis connection manager
│   │   └── cache.ts                           → Redis cache wrapper
│   └── shared/
│       ├── errors/
│       │   ├── AppError.ts                    → Custom error class with HTTP status
│       │   └── errorHandler.ts                → Central error middleware
│       ├── middleware/
│       │   ├── auth.middleware.ts              → JWT RS256 + API key dual auth
│       │   ├── rateLimiter.middleware.ts       → Per-key rate limiting
│       │   └── validate.middleware.ts          → Generic Zod validation
│       ├── utils/
│       │   ├── logger.ts                      → Pino structured logger
│       │   ├── pagination.ts                  → Page/limit parser + meta builder
│       │   └── hashText.ts                    → SHA-256 cache key generation
│       └── types/
│           └── common.types.ts                → ApiResponse, PaginatedResponse
```

---

## Dependency Map

How Phase 1 files depend on each other:

```
env.ts ──────────────┬──→ db.ts ──→ (connectAll, disconnectAll)
                     │        ↑
                     ├──→ cache.ts (Redis wrapper)
                     │
                     ├──→ rateLimiter.middleware.ts
                     │
                     ├──→ auth.middleware.ts
                     │
                     └──→ logger.ts
                              ↓
                         db.ts, errorHandler.ts

AppError.ts ──→ errorHandler.ts
           ──→ auth.middleware.ts

common.types.ts ──→ pagination.ts
```

---

## Request Flow Through Phase 1

Every API request passes through this pipeline:

```
Client Request
    │
    ▼
[rateLimiter.middleware] ── 429 if exceeded
    │
    ▼
[auth.middleware] ── 401 if invalid JWT/key
    │  1. Check Authorization: Bearer <jwt>
    │  2. Fallback: x-api-key header
    │  3. Attach userId + userPlan to req
    │
    ▼
[validate.middleware] ── 422 if Zod fails
    │  Parse req.body/query/params with Zod
    │  Strip unknown fields, coerce types
    │
    ▼
[Controller] → [Service] → Response
    │
    ▼ (on error)
[errorHandler.ts] ── catches ALL thrown errors
    │  AppError → its statusCode
    │  ValidationError → 422
    │  DuplicateKey → 409
    │  Unknown → 500 (never exposes stack)
```

---

## File-by-File Detail

---

### 1. `package.json`

**What:** Project definition — dependencies, scripts, ESM config.

**Key config:**

| Field | Value | Why |
|-------|-------|-----|
| `"type": "module"` | ESM | Enables `import/export` syntax. Express v5 and modern packages expect this |
| `"main": "dist/server.js"` | Entry | Points to compiled output for production |

**Scripts:**

| Script | Command | When to use |
|--------|---------|-------------|
| `dev` | `tsx watch src/server.ts` | Development — hot reload on file change |
| `build` | `tsc` | Compile TypeScript to `dist/` |
| `start` | `node dist/server.js` | Production — run compiled JS |
| `seed:all` | chains 3 seed scripts | First run — populate DB with plans, weights, templates |
| `test` | `vitest run` | Run all tests once |
| `lint` | `eslint src --ext .ts` | Check code style |

**Production dependencies (Phase 1 relevant):**

| Package | Version | Role |
|---------|---------|------|
| `express` | ^5.1.0 | HTTP framework. v5 has native async error handling |
| `mongoose` | ^8.14.1 | MongoDB ODM with schema validation |
| `zod` | ^3.25.17 | Runtime validation + TypeScript type inference |
| `redis` | ^5.0.1 | Redis client for caching |
| `jsonwebtoken` | ^9.0.2 | JWT sign/verify with RS256 |
| `pino` | ^9.6.0 | Fastest Node.js structured logger |
| `pino-pretty` | ^13.0.0 | Human-readable logs in dev mode |
| `express-rate-limit` | ^7.5.0 | Request rate limiting per key |
| `helmet` | ^8.1.0 | Security headers (X-Content-Type-Options, etc.) |
| `cors` | ^2.8.5 | Cross-origin resource sharing |

---

### 2. `tsconfig.json`

**What:** TypeScript compiler configuration.

**Key settings:**

| Setting | Value | Why |
|---------|-------|-----|
| `target` | `ES2022` | Supports top-level await, `Array.at()`. Node 18+ handles natively |
| `module` | `NodeNext` | ESM imports with `.js` extensions. Required for `"type": "module"` |
| `moduleResolution` | `NodeNext` | Matches module setting. Resolves `.js` extensions correctly |
| `strict` | `true` | Enables: `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, etc. |
| `noUnusedLocals` | `true` | Compile error on unused variables — prevents dead code |
| `noUnusedParameters` | `true` | Compile error on unused function params |
| `noImplicitReturns` | `true` | Every code path must return — prevents silent `undefined` |
| `noFallthroughCasesInSwitch` | `true` | Requires `break` in switch cases |
| `declaration` | `true` | Generates `.d.ts` files — useful if the agent engine is ever exported as a package |
| `sourceMap` | `true` | Maps compiled JS back to TS for debugging |

**Why these are important:** Strict mode catches ~30% of bugs at compile time that would otherwise appear in production (null references, missing returns, implicit any types).

---

### 3. `.env.example`

**What:** Template for all environment variables. Copy to `.env` and fill values.

**Variable groups:**

| Group | Count | Variables |
|-------|-------|-----------|
| Server | 2 | `NODE_ENV`, `PORT` |
| MongoDB | 1 | `MONGO_URI` |
| Cache | 3 | `CACHE_TTL`, `REDIS_CACHE_LIVE`, `REDIS_CACHE_DEV` |
| Rate Limiting | 3 | `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX_FREE`, `RATE_LIMIT_MAX_PRO` |
| Auth | 5 | `API_KEY_SALT`, `ACCESS_PUBLICE_KEY`, `ACCESS_PRAIVET_KEY`, `REFRSH_PUBLICE_KEY`, `REFRSH_PRAIVET_KEY` |
| Stripe | 8 | Secret key, webhook secret, 6 price IDs |
| Paymob | 9 | API URL, intention URL, iframe ID, keys, integration IDs, HMAC |
| **Total** | **31** | |

---

### 4. `src/config/env.ts` — Environment Validation

**What:** Validates ALL 31 env vars at startup using Zod. If any are missing or wrong type → app crashes immediately with a clear error message.

**Why it exists:** Without this, a missing `MONGO_URI` would only crash when the first DB query runs — maybe minutes later, in production. With Zod validation, it fails **fast and loud** at startup.

**How it works:**
1. Defines a Zod schema with every env var, types, and defaults
2. `z.coerce.number()` auto-converts string `"3000"` to number `3000` (`process.env` values are always strings)
3. `safeParse` validates without throwing — we handle the error ourselves
4. On failure: formats field-level errors and throws with readable output
5. Exports typed `env` object — every usage gets autocomplete + type safety

**Exports:**

| Export | Type | Purpose |
|--------|------|---------|
| `env` | `Env` (Zod inferred) | Typed config object. Used everywhere |
| `getRedisUrl()` | `() => string` | Returns `REDIS_CACHE_LIVE` in production, `REDIS_CACHE_DEV` in dev |
| `Env` | Type | TypeScript type for the full env object |

**Example failure output:**
```
❌ Invalid environment variables:
  MONGO_URI: Required
  API_KEY_SALT: String must contain at least 8 character(s)
```

---

### 5. `src/config/db.ts` — Database Connection Manager

**What:** Connects MongoDB + Redis. Provides `connectAll()` and `disconnectAll()` for lifecycle management.

**Why separate `connectAll`:** Server startup needs both MongoDB and Redis ready before accepting requests. One function handles both, in order.

**MongoDB settings:**

| Setting | Value | Why |
|---------|-------|-----|
| `maxPoolSize` | 10 | 10 concurrent connections. Default 100 is overkill for single instance |
| `serverSelectionTimeoutMS` | 5000 | Fail fast (5s) if MongoDB unreachable. Default 30s is too slow |
| `socketTimeoutMS` | 45000 | Kill stale connections after 45s |

**Behavior on failure:**
- Initial connection fails → `process.exit(1)`. App can't function without DB. Let Docker/PM2 restart it.
- Mid-runtime disconnect → Mongoose auto-reconnects. Logged as warning.
- Mid-runtime error → Logged as error. Connection stays alive, Mongoose retries.

**Exports:**

| Export | Purpose |
|--------|---------|
| `connectDB()` | Connect MongoDB only |
| `connectAll()` | Connect MongoDB + Redis (used by `server.ts`) |
| `disconnectAll()` | Disconnect both (used in graceful shutdown) |

---

### 6. `src/config/cache.ts` — Redis Cache Wrapper

**What:** Thin typed wrapper around the `redis` client. Provides `cacheGet`, `cacheSet`, `cacheDel`.

**Why a wrapper:**
- Isolates Redis client creation from business logic
- Auto-serializes/deserializes JSON
- Defaults TTL from `env.CACHE_TTL`
- Typed generics: `cacheGet<AgentOutput>(key)` returns `AgentOutput | null`

**Connection behavior:**
- Uses `getRedisUrl()` from `env.ts` → connects to dev or live Redis based on `NODE_ENV`
- Event listeners for `error`, `connect`, `reconnecting` — all logged via Pino
- `connectRedis()` called by `db.ts → connectAll()`

**Exports:**

| Export | Signature | Purpose |
|--------|-----------|---------|
| `connectRedis()` | `() → Promise<void>` | Connect Redis client |
| `disconnectRedis()` | `() → Promise<void>` | Graceful quit |
| `cacheGet<T>(key)` | `(key) → Promise<T \| null>` | Get + JSON.parse |
| `cacheSet<T>(key, value, ttl?)` | `(key, value, ttl?) → Promise<void>` | JSON.stringify + SET with EX |
| `cacheDel(key)` | `(key) → Promise<void>` | Delete key |
| `getRedisClient()` | `() → RedisClientType` | Raw client (for advanced ops) |

**Why Redis over node-cache:**
- Survives app restarts (data persists)
- Shared across multiple app instances (horizontal scaling)
- Separate dev/prod instances prevent cache pollution
- **Tradeoff:** Requires Redis infrastructure. Mitigated by Docker Compose setup.

---

### 7. `src/shared/utils/logger.ts` — Pino Logger

**What:** Structured JSON logging in production, pretty-printed in development.

**Why Pino:**
- 3-5x faster than Winston (benchmarked)
- JSON output in production → parseable by Datadog, ELK, CloudWatch
- Zero overhead serialization
- `pino-pretty` only loads in development (conditional transport)

**Configuration:**

| Environment | Level | Transport | Output |
|-------------|-------|-----------|--------|
| Production | `info` | None (raw JSON) | `{"level":30,"time":1234,"msg":"..."}` |
| Development | `debug` | `pino-pretty` | `12:34:56 INFO: MongoDB connected` |
| Test | `debug` | `pino-pretty` | Same as dev |

**Why not `console.log`:** Blocks event loop, no log levels, no structure, no timestamps. Never in production.

---

### 8. `src/shared/errors/AppError.ts` — Custom Error Class

**What:** Extends `Error` with `statusCode` and `isOperational` flag.

**Why it exists:** Standard `Error` has no `statusCode`. Without it, the error handler can't decide which HTTP status to return → everything becomes 500.

**Properties:**

| Property | Type | Purpose |
|----------|------|---------|
| `message` | string | Human-readable error message |
| `statusCode` | number | HTTP status code (400, 401, 404, etc.) |
| `isOperational` | boolean | `true` = expected error (bad input). `false` = bug (null pointer) |

**Static factory methods:**

| Method | Status | When to use |
|--------|--------|-------------|
| `AppError.badRequest(msg)` | 400 | Invalid input, missing fields |
| `AppError.unauthorized(msg)` | 401 | Invalid/missing auth |
| `AppError.notFound(msg)` | 404 | Resource doesn't exist |
| `AppError.conflict(msg)` | 409 | Duplicate entry (email exists) |
| `AppError.tooMany(msg)` | 429 | Rate limit or token limit exceeded |
| `AppError.internal(msg)` | 500 | Unexpected bug (isOperational = false) |

**Usage in services:**
```typescript
throw AppError.notFound('Prompt not found');
throw AppError.conflict('Email already registered');
```

---

### 9. `src/shared/errors/errorHandler.ts` — Central Error Middleware

**What:** Express error middleware. Catches ALL errors thrown anywhere in the request pipeline.

**Why centralized:** Without it, every controller needs its own try/catch + error response formatting. With it, controllers just `throw` — the handler formats consistently.

**Error handling matrix:**

| Error Type | Detection | Status | Response |
|------------|-----------|--------|----------|
| `AppError` | `instanceof AppError` | The error's `statusCode` | `{ success: false, message }` |
| Mongoose Validation | `err.name === 'ValidationError'` | 422 | `{ success: false, message: "Validation failed" }` |
| Mongoose Duplicate Key | `err.code === 11000` | 409 | `{ success: false, message: "Duplicate entry" }` |
| Unknown / Bug | Fallback | 500 | `{ success: false, message: "Internal server error" }` |

**Security rules:**
- NEVER exposes stack traces in response (production or dev)
- `isOperational = false` errors logged at ERROR level with full stack (server-side only)
- In dev mode: `detail` field added to validation errors for debugging

---

### 10. `src/shared/middleware/auth.middleware.ts` — Authentication

**What:** Dual auth — JWT RS256 (primary) + API key (fallback). Also exports JWT sign/verify functions.

**Why dual auth:**
- JWT Bearer: stateless, fast, no DB lookup. Used by frontend clients.
- API key: simple header, one DB lookup. Used for API-to-API calls, scripts, testing.

**Auth flow:**

```
1. Check Authorization: Bearer <token>
   ├── Found → jwt.verify with RS256 public key
   │           ├── Valid → attach userId + plan → next()
   │           └── Invalid → 401
   │
2. Check x-api-key header
   ├── Found → DB lookup User.findOne({ apiKey })
   │           ├── Found → attach userId + plan → next()
   │           └── Not found → 401
   │
3. Neither present → 401 "Missing authentication"
```

**JWT configuration:**

| Token | Algorithm | Key Pair | Expiry | Purpose |
|-------|-----------|----------|--------|---------|
| Access | RS256 | `ACCESS_PUBLICE_KEY` / `ACCESS_PRAIVET_KEY` | 15 min | Short-lived, used per request |
| Refresh | RS256 | `REFRSH_PUBLICE_KEY` / `REFRSH_PRAIVET_KEY` | 7 days | Long-lived, used to get new access token |

**Why RS256 (asymmetric) over HS256 (symmetric):**
- Private key only on the server (signing)
- Public key can be distributed to any service that needs to verify
- Key compromise: rotate without coordinating with all services
- **Tradeoff:** Slightly slower than HS256 (~1ms vs ~0.1ms). Negligible.

**Exports:**

| Export | Purpose |
|--------|---------|
| `authMiddleware` | Express middleware — attach userId/plan or reject |
| `signAccessToken(payload)` | Generate 15min access token |
| `signRefreshToken(payload)` | Generate 7d refresh token |
| `verifyRefreshToken(token)` | Verify + decode refresh token |
| `AuthRequest` | Extended Request type with userId/userPlan |

---

### 11. `src/shared/middleware/rateLimiter.middleware.ts` — Rate Limiting

**What:** Two limiters using `express-rate-limit`:
- `rateLimiter` — General: configurable per plan (default 10/hr free, 200/hr pro)
- `strictRateLimiter` — Strict: 5/hr for sensitive endpoints (registration)

**Key config:**

| Setting | Value | Why |
|---------|-------|-----|
| `windowMs` | From `env.RATE_LIMIT_WINDOW_MS` (default 1hr) | Sliding window duration |
| `max` | From `env.RATE_LIMIT_MAX_FREE` (default 10) | Max requests per window |
| `keyGenerator` | Uses `x-api-key` header, falls back to `req.ip` | Per-user tracking (not per-IP, because Docker shares IPs) |
| `standardHeaders` | `true` | Sends `RateLimit-*` headers in response |
| `legacyHeaders` | `false` | Disables deprecated `X-RateLimit-*` headers |

**Why `keyGenerator` uses API key:** Behind Nginx/Docker, all requests may share the same IP. Using the API key isolates rate limits per user.

---

### 12. `src/shared/middleware/validate.middleware.ts` — Zod Validation

**What:** Generic middleware factory. Takes a Zod schema + target (`body`/`query`/`params`) → validates the request.

**Why before controller:** Controllers should receive clean, typed data. If validation happens inside the controller, you mix validation logic with business logic.

**How it works:**
1. `schema.parse(req[target])` → validates + strips unknown fields + coerces types
2. Valid → overwrites `req[target]` with parsed data → calls `next()`
3. Invalid → returns 422 with field-level errors

**Usage in routes:**
```typescript
router.post('/optimize', validate(optimizeSchema), optimizeController);
router.get('/history', validate(historyQuerySchema, 'query'), historyController);
```

**Error response format:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    { "field": "text", "message": "String must contain at least 3 character(s)" },
    { "field": "targetModel", "message": "Invalid enum value" }
  ]
}
```

---

### 13. `src/shared/utils/pagination.ts` — Pagination Helper

**What:** Two functions: `parsePagination` (parse query params) and `buildPaginationMeta` (build response metadata).

**Why a helper:** Every list endpoint (prompt history, templates) needs pagination. Without this, you repeat the same parsing + meta-building everywhere.

**Bounds:**
- `page`: min 1, defaults to 1
- `limit`: min 1, max 50, defaults to 20

**Usage:**
```typescript
const { page, limit } = parsePagination(req.query);
const meta = buildPaginationMeta(total, page, limit);
// meta = { total: 234, page: 1, limit: 20, totalPages: 12 }
```

---

### 14. `src/shared/utils/hashText.ts` — Cache Key Generator

**What:** Takes prompt text → normalizes (lowercase, collapse whitespace) → SHA-256 hash → first 16 hex chars.

**Why normalize:** `"Write a function"` and `"write  a  function"` should hit the same cache. Without normalization, minor whitespace changes = cache miss.

**Why SHA-256 truncated to 16 chars:** Full SHA-256 is 64 chars — wasteful as a cache key. 16 hex chars = 64 bits = 18 quintillion possibilities. Collision probability is negligible at our scale.

**Usage:**
```typescript
const cacheKey = `prompt:${hashText(text)}:${targetModel}`;
// cacheKey = "prompt:a3b1c9f2e8d4a7b0:claude"
```

---

### 15. `src/shared/types/common.types.ts` — Shared Response Types

**What:** Interfaces for consistent API responses across all endpoints.

**Types:**

| Type | Shape | Used by |
|------|-------|---------|
| `ApiResponse<T>` | `{ success, data, message? }` | All single-item responses |
| `PaginatedResponse<T>` | `{ success, data[], meta }` | History, templates, plan lists |
| `PaginationQuery` | `{ page, limit }` | Parsed pagination params |

**Why:** Without shared types, one endpoint returns `{ data: ... }` and another returns `{ result: ... }`. Inconsistent responses = frustrated frontend developers.

---

## What Phase 1 Enables

Every subsequent phase depends on this infrastructure:

| Phase | Uses from Phase 1 |
|-------|-------------------|
| **Phase 2 — DB Models** | `db.ts` (Mongoose connection), `env.ts` (MONGO_URI) |
| **Phase 3 — Analyzer** | None directly (pure logic), but integrated via Phase 6 |
| **Phase 4 — Rule Engine** | None directly (pure logic) |
| **Phase 5 — Learner** | `cache.ts` (weight caching), DB connection |
| **Phase 6 — Agent Engine** | `cache.ts` (prompt caching), `hashText.ts` (cache keys) |
| **Phase 7 — Cache Layer** | `cache.ts` (Redis wrapper), `hashText.ts` |
| **Phase 8 — API Routes** | ALL middleware (auth, validate, rateLimiter), `errorHandler`, `logger`, `pagination`, `AppError`, `common.types` |
| **Phase 9 — Token System** | `auth.middleware.ts` (userId), `AppError` |
| **Phase 10 — Subscriptions** | `env.ts` (Stripe/Paymob keys), `auth.middleware.ts`, `AppError` |
| **Phase 11 — Docker** | `env.ts` (all config), `db.ts` (connectAll), `logger` |

---

## How to Verify Phase 1

After Phase 1, you should be able to:

1. `pnpm install` — installs all dependencies without errors
2. `pnpm build` — compiles TypeScript without errors (once all imports exist)
3. Environment validation works:
   - Missing `MONGO_URI` → clear error on startup
   - All 31 vars validated with types
4. Redis connects using dev URL in development
5. MongoDB connects with pool settings
6. Logger outputs pretty logs in dev, JSON in production
7. All middleware is importable and typed

---

## Next: Phase 2

Phase 2 creates the MongoDB models (users, prompts, learned_weights, plans, templates, token_ledger, payment_history) that the agent engine and API modules depend on.
