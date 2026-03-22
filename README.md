<div align="center">

# 0Gosha

<img src="https://lh3.googleusercontent.com/d/1VEvn9IHM9hGmx2YRhfvKiqExMB57ojfK" width="200" alt="0Gosha" />

**Pure AI agent engine that optimizes prompts - learns from user feedback.**

[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)](package.json)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.1.0-lightgrey.svg)](https://expressjs.com/)

No AI API calls. No OpenAI. No Claude API. 0Gosha is a self-contained rule-based engine that rewrites raw user text into professional, structured prompts optimized for Claude, GPT, or any LLM. It gets smarter over time by learning which transformation rules produce the highest-rated results.
</div>


---

## How It Works

![Flow Diagrams](https://lh3.googleusercontent.com/d/1amoHFhbnDXEAuV9zJiROl9sb7zr0MS1m)

```
Raw text → Analyze → Learn → Transform → Score → Return optimized prompt
               │          │         │
               │          │         └── Rule engine (7 rules, sorted by learned weight)
               │          └── MongoDB: find similar past prompts with high scores
               └── Tokenizer + Classifier + Gap detector (pure logic)
```

**The learning loop:** Every optimization is saved. When users rate results, rule weights adjust — good rules get boosted, bad rules get penalized. Over time, the engine develops category-specific preferences for which rules work best.

---

## Features

- **Prompt optimization** — Adds role, context, task, constraints, output format to raw text
- **Model-aware** — Formats for Claude (XML tags), GPT (markdown), or general use
- **Self-learning** — Rule weights evolve from user ratings via MongoDB
- **Similarity search** — Reuses structural patterns from past high-scoring prompts
- **Token billing** — Per-request token cost based on prompt complexity (daily limits)
- **Subscription plans** — Free / Starter / Pro / Enterprise
- **Dual payments** — Stripe (international) + Paymob (Card + Wallet)
- **JWT auth** — RSA key pairs (access + refresh tokens) with API key fallback
- **Redis cache** — Separate live/dev Redis instances
- **Zero AI cost** — No external AI API calls, runs entirely on your infrastructure

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express v5 |
| Language | TypeScript (strict) |
| Database | MongoDB + Mongoose |
| Cache | Redis |
| Auth | JWT (RS256) + API key fallback |
| Validation | Zod |
| Payments | Stripe + Paymob |
| Logging | Pino |
| Container | Docker + Nginx |
| Tests | Vitest |

---

## Quick Start

### Prerequisites

- Node.js >= 18
- MongoDB >= 6
- Redis >= 7
- pnpm (recommended) or npm

### 1. Clone & install

```bash
git clone https://github.com/your-username/0Gosha.git
cd 0Gosha
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values (see [Environment Variables](#environment-variables) below).

### 3. Generate RSA key pairs

```bash
# Access token keys
openssl genrsa -out access-private.pem 2048
openssl rsa -in access-private.pem -pubout -out access-public.pem

# Refresh token keys
openssl genrsa -out refresh-private.pem 2048
openssl rsa -in refresh-private.pem -pubout -out refresh-public.pem
```

Copy the contents into your `.env` as single-line strings (replace newlines with `\n`).

### 4. Seed the database

```bash
pnpm seed:weights     # Initialize rule weights
pnpm seed:templates   # Load prompt templates
```

### 5. Run

```bash
# Development (hot reload)
pnpm dev

# Production
pnpm build
pnpm start
```

### 6. Docker

```bash
docker-compose up -d
```

---

## API Reference

### Authentication

0Gosha supports two auth methods:

**JWT Bearer (primary):**
```
Authorization: Bearer <access_token>
```

**API key (fallback):**
```
x-api-key: gsh_a1b2c3d4e5f6...
```

---

### Prompt Optimization

#### Optimize a prompt

```
POST /api/prompts/optimize
```

**Body:**
```json
{
  "text": "write me a function that sorts an array",
  "targetModel": "claude"
}
```

`targetModel` options: `"claude"` | `"gpt"` | `"general"`

**Response:**
```json
{
  "success": true,
  "data": {
    "promptId": "665a1b2c3d4e5f6a7b8c9d0e",
    "original": "write me a function that sorts an array",
    "optimized": "<role>\nYou are a senior software engineer...\n</role>\n\n<task>...</task>\n\n<constraints>...</constraints>\n\n<output_format>...</output_format>",
    "score": 8,
    "suggestions": [
      "Add examples: your prompt would benefit from an explicit examples section."
    ],
    "analysis": {
      "category": "coding",
      "complexity": "simple",
      "gaps": [
        { "element": "role", "severity": "ok" },
        { "element": "examples", "severity": "missing" }
      ],
      "rulesApplied": ["add_role", "add_context", "structure_task", "add_constraints", "add_output_format"],
      "learnedFromPast": false
    }
  },
  "usage": {
    "tokensUsed": 1,
    "tokensRemaining": 49,
    "dailyLimit": 50,
    "resetsAt": "2026-03-22T00:00:00Z"
  }
}
```

#### Rate an optimization

```
PATCH /api/prompts/:id/rate
```

```json
{ "score": 9 }
```

This is how the engine learns. Score >= 7 boosts rule weights. Score < 5 penalizes.

#### Get history

```
GET /api/prompts/history?page=1&limit=20
```

#### Get single optimization

```
GET /api/prompts/:id
```

---

### Auth

#### Register

```
POST /api/users/register
```

```json
{ "email": "user@example.com", "password": "securepassword" }
```

**Response:**
```json
{
  "success": true,
  "data": {
    "userId": "665a...",
    "email": "user@example.com",
    "apiKey": "gsh_a1b2c3d4e5f6...",
    "accessToken": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "plan": "free",
    "tokens": { "used": 0, "limit": 10 }
  }
}
```

#### Login

```
POST /api/users/login
```

```json
{ "email": "user@example.com", "password": "securepassword" }
```

#### Refresh token

```
POST /api/users/refresh
```

```json
{ "refreshToken": "eyJhbG..." }
```

#### Get profile

```
GET /api/users/me
```

---

### Templates

```
GET /api/templates?category=coding
GET /api/templates/:id
```

---

### Subscriptions

#### List plans

```
GET /api/subscriptions/plans
```

#### Upgrade (Stripe)

```
POST /api/subscriptions/upgrade
```

```json
{ "planId": "665a...", "billing": "monthly", "provider": "stripe" }
```

Returns `{ checkoutUrl }` — redirect user to Stripe hosted checkout.

#### Upgrade (Paymob)

```
POST /api/subscriptions/upgrade
```

```json
{ "planId": "665a...", "billing": "monthly", "provider": "paymob", "method": "card" }
```

`method`: `"card"` | `"wallet"`

Returns `{ paymentUrl, iframeUrl }` — redirect user to Paymob payment page.

#### Cancel

```
POST /api/subscriptions/cancel
```

#### Usage

```
GET /api/subscriptions/usage
```

```json
{
  "success": true,
  "data": {
    "plan": "starter",
    "tokens": { "used": 12, "limit": 50, "remaining": 38, "resetsAt": "..." },
    "billing": { "status": "active", "currentPeriodEnd": "...", "provider": "paymob" }
  }
}
```

---

### Webhooks

```
POST /api/webhooks/stripe    — Stripe signature verification
POST /api/webhooks/paymob    — Paymob HMAC verification
```

---

### System

```
GET /api/health
```

---

## Subscription Plans

| | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| **Price** | $0 | $9/mo | $29/mo | $99/mo |
| **Tokens/Day** | 10 | 50 | 500 | 5,000 |
| **History** | Last 10 | Last 100 | Unlimited | Unlimited |
| **Target models** | General | All | All | All |
| **Rate limit** | 10/hr | 30/hr | 200/hr | 1,000/hr |

### Token costs

| Prompt complexity | Cost |
|---|---|
| Simple (<= 50 words) | 1 token |
| Medium (51-200 words) | 3 tokens |
| Complex (200+ words) | 5 tokens |
| Cache hit | 0 tokens |

Tokens reset daily at midnight UTC.

### Payment providers

| Provider | Region | Methods | Webhook |
|---|---|---|---|
| **Stripe** | International | Card | Signature-verified |
| **Paymob** | MENA / Egypt | Card + Mobile Wallet | HMAC-verified |

---

## Agent Engine

### The 5 phases

1. **Analyze** — Tokenizer extracts keywords, Classifier detects category + complexity, Gap Scorer finds missing prompt elements
2. **Learn** — Similarity search in MongoDB for past high-scoring prompts, load per-rule learned weights
3. **Transform** — Rule engine applies matching rules sorted by weight, Model adapter formats for target
4. **Merge** — If a similar high-scoring prompt exists, borrow its structural sections
5. **Record** — Save to history for future learning

### Built-in rules

| Rule | What it does |
|------|-------------|
| `add_role` | Injects category-specific role persona |
| `add_context` | Adds context section with detected intent |
| `structure_task` | Wraps user text in structured task block |
| `add_constraints` | Adds "Do NOT..." rules per category |
| `add_output_format` | Specifies output format per category + model |
| `improve_specificity` | Replaces vague words with specific alternatives |
| `add_quality_markers` | Adds quality requirements for complex prompts |

### Learning mechanism

- Score >= 7: each rule used gets weight +0.1 (cap: 3.0)
- Score < 5: each rule used gets weight -0.05 (floor: 0.2)
- Weekly cron: all weights x 0.95 (decay prevents stale patterns)

---

## Project Structure

```
0Gosha/
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── nginx/default.conf
├── src/
│   ├── config/
│   │   ├── env.ts                  — Zod-validated env vars
│   │   ├── db.ts                   — MongoDB + Redis connection
│   │   └── cache.ts                — Redis cache wrapper
│   ├── shared/
│   │   ├── errors/
│   │   │   ├── AppError.ts         — Custom error class
│   │   │   └── errorHandler.ts     — Central error middleware
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts   — JWT RS256 + API key fallback
│   │   │   ├── tokenGuard.middleware.ts — Token budget check
│   │   │   ├── rateLimiter.middleware.ts
│   │   │   └── validate.middleware.ts
│   │   └── utils/
│   │       ├── logger.ts           — Pino structured logging
│   │       ├── pagination.ts
│   │       └── hashText.ts         — Cache key generation
│   ├── agent/
│   │   ├── tokenizer.ts            — Text to weighted tokens
│   │   ├── classifier.ts           — Category + complexity detection
│   │   ├── gap-scorer.ts           — Missing element detection
│   │   ├── rule-engine.ts          — Weighted rule execution
│   │   ├── rules/                  — Individual rule implementations
│   │   ├── model-adapter.ts        — XML / Markdown / Bracket formatting
│   │   ├── learner.ts              — Similarity search + feedback
│   │   ├── merger.ts               — Blend with learned patterns
│   │   └── agent-engine.ts         — Main orchestrator
│   ├── modules/
│   │   ├── prompt/                 — Optimize, history, rating
│   │   ├── template/               — Prompt templates
│   │   ├── user/                   — Register, login, refresh, profile
│   │   └── subscription/           — Plans, tokens, Stripe, Paymob
│   ├── jobs/
│   │   ├── resetTokens.job.ts      — Daily token reset
│   │   └── decayWeights.job.ts     — Weekly weight decay
│   ├── app.ts
│   └── server.ts
├── scripts/
│   ├── seed-plans.ts
│   ├── seed-templates.ts
│   └── seed-weights.ts
├── tests/
├── .env.example
├── tsconfig.json
└── package.json
```

---

## Development

### Scripts

```bash
pnpm dev              # Start with hot reload
pnpm build            # Compile TypeScript
pnpm start            # Run production build
pnpm test             # Run tests
pnpm test:watch       # Tests in watch mode
pnpm lint             # Lint source files
pnpm seed:weights     # Initialize learned weights
pnpm seed:templates   # Seed prompt templates
```

### Docker

```bash
docker-compose up -d            # Start all services
docker-compose up -d --build    # Rebuild
docker-compose logs -f app      # View logs
docker-compose down             # Stop
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| **Server** | | |
| `NODE_ENV` | No | `development` / `production` / `test` |
| `PORT` | No | Server port (default: 3000) |
| **MongoDB** | | |
| `MONGO_URI` | Yes | MongoDB connection string |
| **Cache** | | |
| `CACHE_TTL` | No | Cache TTL seconds (default: 3600) |
| `REDIS_CACHE_LIVE` | Yes | Redis URL for production |
| `REDIS_CACHE_DEV` | Yes | Redis URL for development |
| **Rate Limiting** | | |
| `RATE_LIMIT_WINDOW_MS` | No | Window in ms (default: 3600000) |
| `RATE_LIMIT_MAX_FREE` | No | Max req/hr free tier (default: 10) |
| `RATE_LIMIT_MAX_PRO` | No | Max req/hr pro tier (default: 200) |
| **Auth** | | |
| `API_KEY_SALT` | Yes | Salt for API key generation |
| `ACCESS_PUBLICE_KEY` | Yes | RSA public key for access tokens |
| `ACCESS_PRAIVET_KEY` | Yes | RSA private key for access tokens |
| `REFRSH_PUBLICE_KEY` | Yes | RSA public key for refresh tokens |
| `REFRSH_PRAIVET_KEY` | Yes | RSA private key for refresh tokens |
| **Stripe** | | |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret |
| `STRIPE_PRICE_STARTER_MONTHLY` | Yes | Stripe Price ID |
| `STRIPE_PRICE_STARTER_YEARLY` | Yes | Stripe Price ID |
| `STRIPE_PRICE_PRO_MONTHLY` | Yes | Stripe Price ID |
| `STRIPE_PRICE_PRO_YEARLY` | Yes | Stripe Price ID |
| `STRIPE_PRICE_ENTERPRISE_MONTHLY` | Yes | Stripe Price ID |
| `STRIPE_PRICE_ENTERPRISE_YEARLY` | Yes | Stripe Price ID |
| **Paymob** | | |
| `PAYMOB_API` | Yes | Paymob API base URL |
| `PAYMOB_API_INTENTION` | Yes | Payment intention endpoint |
| `PAYMOB_iframes_id` | Yes | Paymob iframe ID |
| `Paymob_API_Key` | Yes | Paymob API key |
| `Paymob_Secret_Key` | Yes | Paymob secret key |
| `Paymob_Public_Key` | Yes | Paymob public key |
| `Paymob_integration_id_Card` | Yes | Card integration ID |
| `Paymob_integration_id_Wallet` | Yes | Wallet integration ID |
| `PAYMOB_HMAC` | Yes | Webhook HMAC verification |

---

## Architecture Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| No AI API | Rule-based engine | Zero cost per request, full control, no vendor lock-in |
| JWT RS256 | Auth | Asymmetric keys — verify without exposing private key. Stateless |
| API key fallback | Auth | Simple auth for API-to-API calls, scripts, testing |
| Redis | Cache | Shared across instances, survives restarts, production-grade |
| Separate Redis envs | Config | Prevents dev cache polluting production |
| Stripe + Paymob | Payments | Stripe for international, Paymob for MENA/Egypt (card + wallet) |
| MongoDB $text search | Similarity | Built-in, no extra infra. Upgrade to vector search later |
| Pino | Logger | 3-5x faster than Winston, structured JSON |
| Zod | Validation | TypeScript type inference from schemas |
| Express v5 | Framework | Native async error handling |
| Daily token reset | Billing | Prevents day-1 burnout. Consistent daily access |

---

## License

MIT
