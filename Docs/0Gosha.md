# Gosha — Complete Project Plan

## Pure AI Agent Engine + Token System + Subscription Plans

**Stack:** Node.js, Express, TypeScript, MongoDB, node-cache, Docker

**Total Estimate:** 39 working days (~8 weeks, solo developer)

---

## 1. What is Gosha?

A backend API tool that takes raw user text and optimizes it into a professional prompt for Claude/GPT. No AI API calls — the engine uses a pure rule-based system that learns from user feedback over time via MongoDB-stored weights.

![Sequence Diagrams](https://lh3.googleusercontent.com/d/1cDivfLLNX60t8CRehitQ3h2l_mFaYA3M)

### Core Value

![Flow Diagrams](https://lh3.googleusercontent.com/d/1amoHFhbnDXEAuV9zJiROl9sb7zr0MS1m)

| What | How |
|---|---|
| Prompt optimization | Rule engine + gap detection + model-specific formatting |
| Self-learning | Rule weights adjust from user ratings. Similarity search reuses past successes |
| Token-based billing | Users consume "Gosha tokens" per optimization. Daily limit based on plan |
| Subscription plans | Free / Starter / Pro / Enterprise with Stripe payments |

---

## 2. Subscription Plans

| | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| Price | $0 | $9/mo ($86/yr) | $29/mo ($278/yr) | $99/mo ($950/yr) |
| Tokens/Day | 10 | 50 | 500 | 5,000 |
| History | Last 10 | Last 100 | Unlimited | Unlimited |
| Templates | Public only | All | All + custom | All + custom |
| Target models | General only | All 3 | All 3 | All 3 |
| API rate limit | 10/hr | 30/hr | 200/hr | 1,000/hr |

### Token Cost Per Request

| Prompt Length | Complexity | Token Cost |
|---|---|---|
| ≤ 50 words | Simple | 1 token |
| 51-200 words | Medium | 3 tokens |
| 200+ words | Complex | 5 tokens |
| Cache hit (same prompt) | — | 0 tokens (free) |

### Why daily reset, not monthly pool?
Monthly pool → users burn all tokens day 1, angry for 29 days. Daily reset → consistent access, predictable usage. Enterprise gets high enough daily limit for burst use.

---

## 3. Agent Engine — How It Works

### 5 Phases Per Request

**Phase 1 — ANALYZE (pure logic, no DB)**
Tokenizer splits text → Classifier detects category (coding/writing/analysis/marketing/general) + complexity → Gap Scorer finds missing elements (role, context, task, constraints, outputFormat, examples) → produces score 1-10.

**Phase 2 — LEARN (MongoDB reads)**
Similarity Search finds past prompts with high user scores (≥7) → Weight Loader gets per-rule weights for this category → both feed into Phase 3.

**Phase 3 — TRANSFORM (rule engine)**
7 rules sorted by learned weight (highest first). Each rule has a condition (when to fire) and an apply function (how to transform). Model Adapter formats output: Claude → XML tags, GPT → markdown headers, general → bracketed sections.

**Phase 4 — MERGE + SCORE**
If similar high-scoring prompt exists (score ≥8, similarity >0.5) → borrow structural sections from it. Re-analyze final output for a new score. Build suggestions from remaining gaps.

**Phase 5 — RECORD + FEEDBACK LOOP**
Save to prompt_history. When user rates → update rule weights: score ≥7 → boost +0.1, score <5 → penalize -0.05. Weekly cron decays all weights ×0.95 to prevent stale dominance.

### How It Gets Smarter

| Stage | Data | Behavior |
|---|---|---|
| Day 1 (0 ratings) | No history | Rules fire with default weight 1.0. Decent but generic output |
| Week 2 (~50 ratings) | Weights diverging | Coding favors "add_constraints" (weight 1.8). Writing favors "add_role" (weight 1.6) |
| Month 2 (~500 ratings) | Strong patterns | Similarity search returns quality matches. Per-category rule ordering well-tuned |

### Built-in Rules

| ID | Element | When It Fires | What It Does |
|---|---|---|---|
| add_role | role | role missing/weak | Prepends category-specific role persona |
| add_context | context | context missing | Adds context section with detected intent |
| structure_task | task | task missing/weak | Wraps user text in task block with focus areas |
| add_constraints | constraints | constraints missing/weak | Category-specific "Do NOT..." rules |
| add_output_format | outputFormat | format missing/weak | Output spec per category + target model |
| improve_specificity | task | simple + score <5 | Replaces vague words ("good"→"production-ready") |
| add_quality_markers | constraints | complexity ≠ simple | Quality requirements (type safety, clarity, etc.) |

---

## 4. Token System

### How It Works

Token Guard middleware sits between Auth and Controller:

```
Router → Auth → TokenGuard → RateLimit → Validate → Controller
```

| Step | What |
|---|---|
| 1 | Check lastResetAt — new day (UTC)? If yes → reset used=0 |
| 2 | Estimate token cost from text.split(/\s+/).length |
| 3 | Check used + estimatedCost > limit → reject 429 |
| 4 | Agent engine processes prompt |
| 5 | Calculate actual cost (1/3/5 based on final complexity) |
| 6 | Increment user.tokens.used += actualCost |
| 7 | Write token_ledger entry (audit trail) |
| 8 | Return tokensUsed + tokensRemaining in response |

### Why a ledger?
If a user disputes "I didn't use 50 tokens" → show the exact log: which prompts, when, how many. Also enables: refunds, bonus tokens, analytics.

### Daily Reset Strategy
Hybrid: lazy reset in Token Guard (check if lastResetAt < today → reset) + nightly cron as backup for consistency.

---

## 5. Payment System (Stripe)

### Flow

| Step | What |
|---|---|
| 1 | User calls POST /subscriptions/upgrade { planId } |
| 2 | Backend creates Stripe Checkout Session |
| 3 | Returns { checkoutUrl } → user redirects to Stripe hosted page |
| 4 | User pays on Stripe |
| 5 | Stripe webhook: checkout.session.completed |
| 6 | Backend: update user.plan, user.tokens.limit, create payment_history |
| 7 | On renewal: Stripe webhook invoice.paid → log payment |
| 8 | On cancel: Stripe webhook customer.subscription.deleted → downgrade to free |

### Why Stripe Checkout (hosted page)?
PCI compliance handled by Stripe. No card data touches your server. Less code, less liability.

### Why webhooks, not polling?
Real-time, reliable, Stripe retries failed deliveries.

---

## 6. MongoDB Collections

### users
```
{
  _id, email (unique), apiKey (unique),
  plan: "free" | "starter" | "pro" | "enterprise",
  tokens: {
    used: number,
    limit: number,
    lastResetAt: Date
  },
  subscription: {
    planId: ObjectId,
    status: "active" | "canceled" | "past_due",
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    cancelAtPeriodEnd: boolean,
    paymentProvider: "stripe",
    externalCustomerId: string,
    externalSubscriptionId: string
  } | null,
  createdAt, updatedAt
}
Indexes: { apiKey: 1 }, { email: 1 }
```

### prompt_history
```
{
  _id, originalText, optimizedText,
  category, targetModel, rulesApplied: string[],
  score: number, userScore: number | null,
  userId (indexed), keywords: string[],
  tokensCost: number,
  createdAt, updatedAt
}
Indexes: { originalText: 'text', keywords: 'text' },
         { category: 1, userScore: -1 },
         { userId: 1, createdAt: -1 }
```

### learned_weights
```
{
  _id, ruleId, category,
  weight: number (0.2-3.0, default 1.0),
  totalUses, totalScore, avgScore
}
Index: { ruleId: 1, category: 1 } unique
```

### plans
```
{
  _id, name, displayName,
  price: { monthly, yearly } (cents),
  tokensPerDay: number,
  features: string[],
  limits: { historyRetention, rateLimit, targetModels: string[], customTemplates: boolean },
  isActive: boolean,
  createdAt
}
```

### templates
```
{
  _id, name, category (indexed),
  description, systemPrompt,
  exampleInput, exampleOutput,
  isActive: boolean,
  createdAt
}
```

### token_ledger
```
{
  _id, userId (indexed),
  amount: number,
  action: "optimize" | "reset" | "bonus" | "refund",
  promptId: ObjectId | null,
  balanceAfter: number,
  metadata: {},
  createdAt
}
Indexes: { userId: 1, createdAt: -1 }
TTL: { createdAt: 1 }, expireAfterSeconds: 7776000 (90 days)
```

### payment_history
```
{
  _id, userId, planId,
  amount (cents), currency: "usd",
  status: "succeeded" | "failed" | "refunded",
  provider: "stripe",
  externalPaymentId: string,
  createdAt
}
```

---

## 7. API Endpoints

### Prompt Module
| Method | Endpoint | Purpose | Auth | Tokens |
|---|---|---|---|---|
| POST | /api/prompts/optimize | Optimize a prompt | Yes | Yes |
| GET | /api/prompts/history | User's past optimizations (paginated) | Yes | No |
| GET | /api/prompts/:id | Single optimization detail | Yes | No |
| PATCH | /api/prompts/:id/rate | Rate optimization (1-10) | Yes | No |

### Template Module
| Method | Endpoint | Purpose | Auth | Tokens |
|---|---|---|---|---|
| GET | /api/templates | List by category | Optional | No |
| GET | /api/templates/:id | Single template | Optional | No |

### User Module
| Method | Endpoint | Purpose | Auth | Tokens |
|---|---|---|---|---|
| POST | /api/users/register | Create account + API key | No | No |
| GET | /api/users/me | Profile + usage stats | Yes | No |

### Subscription Module
| Method | Endpoint | Purpose | Auth | Tokens |
|---|---|---|---|---|
| GET | /api/subscriptions/plans | List available plans | No | No |
| POST | /api/subscriptions/upgrade | Create Stripe checkout session | Yes | No |
| POST | /api/subscriptions/cancel | Cancel (end of period) | Yes | No |
| GET | /api/subscriptions/usage | Token usage + limits | Yes | No |

### Webhooks
| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| POST | /api/webhooks/stripe | Stripe webhook handler | Stripe signature |

### System
| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | /api/health | Health check | No |

---

## 8. Project Structure

```
gosha/
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── nginx/
│       └── default.conf
├── src/
│   ├── config/
│   │   ├── env.ts                            → Zod-validated environment variables
│   │   ├── db.ts                             → Mongoose connection + reconnect
│   │   └── cache.ts                          → node-cache wrapper
│   ├── shared/
│   │   ├── errors/
│   │   │   ├── AppError.ts                   → Custom error class (statusCode, isOperational)
│   │   │   └── errorHandler.ts               → Central error middleware
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts             → API key validation, attach userId+plan
│   │   │   ├── tokenGuard.middleware.ts       → Check token budget, consume after response
│   │   │   ├── rateLimiter.middleware.ts      → Per-key rate limiting
│   │   │   └── validate.middleware.ts         → Generic Zod validation
│   │   ├── utils/
│   │   │   ├── logger.ts                     → Pino structured logger
│   │   │   ├── pagination.ts                 → Page/limit parser + meta builder
│   │   │   └── hashText.ts                   → SHA-256 cache key generation
│   │   └── types/
│   │       └── common.types.ts               → ApiResponse, PaginatedResponse
│   ├── agent/
│   │   ├── @types/
│   │   │   └── index.ts                      → All agent interfaces
│   │   ├── tokenizer.ts                      → Text → Token[] + keyword extraction
│   │   ├── classifier.ts                     → Keyword scoring → category + complexity + intent
│   │   ├── gap-scorer.ts                     → Regex patterns → detect missing elements
│   │   ├── rule-engine.ts                    → Transform rules, sorted by learned weights
│   │   ├── rules/
│   │   │   ├── add-role.rule.ts              → Injects role based on category
│   │   │   ├── add-context.rule.ts           → Adds context section
│   │   │   ├── structure-task.rule.ts        → Wraps task with keywords
│   │   │   ├── add-constraints.rule.ts       → Category-specific constraints
│   │   │   ├── add-output-format.rule.ts     → Output format per category + model
│   │   │   ├── specificity.rule.ts           → Replaces vague words
│   │   │   └── quality-markers.rule.ts       → Quality requirements for complex prompts
│   │   ├── model-adapter.ts                  → XML (Claude) / MD (GPT) / Brackets (general)
│   │   ├── learner.ts                        → Similarity search + weight loading + feedback
│   │   ├── merger.ts                         → Merge rule output with learned patterns
│   │   ├── scorer.ts                         → Re-analyze optimized output for final score
│   │   ├── agent-engine.ts                   → Orchestrator: Analyze → Learn → Transform → Merge → Record
│   │   └── index.ts                          → Barrel export
│   ├── modules/
│   │   ├── prompt/
│   │   │   ├── @types/
│   │   │   │   └── index.ts                  → IPromptHistory, OptimizeDTO, RateDTO
│   │   │   ├── controller/
│   │   │   │   ├── optimize.controller.ts    → POST /api/prompts/optimize
│   │   │   │   ├── history.controller.ts     → GET /api/prompts/history
│   │   │   │   ├── detail.controller.ts      → GET /api/prompts/:id
│   │   │   │   └── rate.controller.ts        → PATCH /api/prompts/:id/rate
│   │   │   ├── service/
│   │   │   │   └── prompt.service.ts         → Calls agent engine, manages history
│   │   │   ├── prompt.model.ts               → Mongoose: prompt_history
│   │   │   ├── prompt.dto.ts                 → Zod: OptimizeSchema, RateSchema
│   │   │   ├── prompt.router.ts
│   │   │   └── index.ts
│   │   ├── template/
│   │   │   ├── @types/
│   │   │   │   └── index.ts
│   │   │   ├── controller/
│   │   │   │   ├── list.controller.ts        → GET /api/templates
│   │   │   │   └── detail.controller.ts      → GET /api/templates/:id
│   │   │   ├── service/
│   │   │   │   └── template.service.ts
│   │   │   ├── template.model.ts
│   │   │   ├── template.dto.ts
│   │   │   ├── template.router.ts
│   │   │   └── index.ts
│   │   ├── user/
│   │   │   ├── @types/
│   │   │   │   └── index.ts
│   │   │   ├── controller/
│   │   │   │   ├── register.controller.ts    → POST /api/users/register
│   │   │   │   └── me.controller.ts          → GET /api/users/me
│   │   │   ├── service/
│   │   │   │   └── user.service.ts           → Register, API key gen, profile
│   │   │   ├── user.model.ts                 → Mongoose: users (with tokens + subscription)
│   │   │   ├── user.dto.ts
│   │   │   ├── user.router.ts
│   │   │   └── index.ts
│   │   └── subscription/
│   │       ├── @types/
│   │       │   └── index.ts                  → IPlan, ITokenLedger, IPaymentHistory
│   │       ├── controller/
│   │       │   ├── plans.controller.ts       → GET /api/subscriptions/plans
│   │       │   ├── upgrade.controller.ts     → POST /api/subscriptions/upgrade
│   │       │   ├── cancel.controller.ts      → POST /api/subscriptions/cancel
│   │       │   └── usage.controller.ts       → GET /api/subscriptions/usage
│   │       ├── service/
│   │       │   ├── subscription.service.ts   → Plan change, Stripe integration
│   │       │   └── token.service.ts          → Consume, check, reset, refund tokens
│   │       ├── subscription.model.ts         → Mongoose: plans, token_ledger, payment_history
│   │       ├── subscription.dto.ts
│   │       ├── subscription.router.ts
│   │       ├── webhook.router.ts             → Stripe webhook (separate, no auth middleware)
│   │       └── index.ts
│   ├── jobs/
│   │   ├── resetTokens.job.ts                → Daily cron: reset all user token counters
│   │   └── decayWeights.job.ts               → Weekly cron: all weights × 0.95
│   ├── app.ts                                → Express app, middleware, route registration
│   └── server.ts                             → Entry point, graceful shutdown
├── scripts/
│   ├── seed-plans.ts                         → Seed subscription plans
│   ├── seed-templates.ts                     → Seed prompt templates
│   └── seed-weights.ts                       → Initialize rule weights
├── tests/
│   ├── unit/
│   │   ├── tokenizer.test.ts
│   │   ├── classifier.test.ts
│   │   ├── gap-scorer.test.ts
│   │   ├── rule-engine.test.ts
│   │   └── token.service.test.ts
│   └── integration/
│       ├── optimize.test.ts
│       ├── feedback.test.ts
│       └── subscription.test.ts
├── .env.example
├── .dockerignore
├── .gitignore
├── tsconfig.json
├── package.json
└── README.md
```

---

## 9. Detailed Phase Breakdown

### Phase 1 — Setup & Infrastructure (4 days)
| Task | Days |
|---|---|
| Express + TS + ESM project scaffold, strict tsconfig | 0.5 |
| Env validation with Zod (including Stripe keys) | 0.5 |
| Pino structured logger | 0.5 |
| Central error handler + AppError class | 0.5 |
| node-cache wrapper with TTL config | 0.5 |
| hashText utility for cache keys | 0.5 |
| Base middleware: auth, rateLimiter, validate | 1 |

### Phase 2 — Database Models & Schemas (4 days)
| Task | Days |
|---|---|
| MongoDB connection with reconnect logic | 0.5 |
| users model (with tokens + subscription embedded docs) | 0.5 |
| prompt_history model + text index | 0.5 |
| learned_weights model + unique compound index | 0.5 |
| plans model | 0.5 |
| token_ledger model + TTL index (90 days) | 0.5 |
| payment_history model | 0.5 |
| templates model | 0.5 |

### Phase 3 — Analyzer: Tokenizer + Classifier + Gap Scorer (3 days)
| Task | Days |
|---|---|
| Tokenizer: stop words, action verbs, domain keywords, weight calculation | 1 |
| Classifier: keyword scoring per category, complexity assessment, intent extraction | 1 |
| Gap Scorer: 6 element detectors with regex patterns, severity scoring, raw score calc | 1 |

### Phase 4 — Rule Engine + Transform (6 days)
| Task | Days |
|---|---|
| Rule interface + engine core (condition check, weight sorting, sequential apply) | 1 |
| add_role rule (per-category role templates) | 0.5 |
| add_context rule | 0.5 |
| structure_task rule | 0.5 |
| add_constraints rule (per-category constraint sets) | 0.5 |
| add_output_format rule (per-category + per-model formatting) | 0.5 |
| improve_specificity rule (vague word replacement map) | 0.5 |
| add_quality_markers rule | 0.5 |
| Model adapter: XML / Markdown / Bracket section formatting | 1 |
| Merger: section extraction + structural blending with learned patterns | 0.5 |

### Phase 5 — Learner + Similarity Search (4 days)
| Task | Days |
|---|---|
| Similarity search via MongoDB $text + score threshold filtering | 1 |
| Weight loader with category filter | 0.5 |
| Record result: save to history + increment rule usage counts | 0.5 |
| Feedback handler: weight boost/penalize + cap/floor logic | 1 |
| Weight decay cron job (weekly × 0.95) | 0.5 |
| Weight initialization script (seed all rules × all categories) | 0.5 |

### Phase 6 — Agent Engine Integration + Feedback (3 days)
| Task | Days |
|---|---|
| Agent engine orchestrator: wire Analyze → Learn → Transform → Merge → Record | 1 |
| Rate endpoint: validate score, load prompt, call feedback handler | 0.5 |
| avgScore recalculation after each feedback | 0.5 |
| Suggestion builder from remaining gaps | 0.5 |
| End-to-end integration test of full agent loop | 0.5 |

### Phase 7 — Cache Layer (2 days)
| Task | Days |
|---|---|
| Hash-based cache key generation (normalized text) | 0.5 |
| Cache check before agent engine, cache write after | 0.5 |
| Cache invalidation: TTL 1hr, bust on same-text re-optimize | 0.5 |
| Weight cache: load weights once per 5min, not per request | 0.5 |

### Phase 8 — API Routes + Controllers (3 days)
| Task | Days |
|---|---|
| Prompt module: 4 controllers + service + DTOs + router | 1 |
| Template module: 2 controllers + service + seed script | 0.5 |
| User module: register + me + API key generation | 1 |
| app.ts wiring + server.ts + graceful shutdown | 0.5 |

### Phase 9 — Token System (4 days)
| Task | Days |
|---|---|
| Token service: consume(), check(), reset(), refund(), getBalance() | 1 |
| Token cost calculator (word count → 1/3/5 tokens) | 0.5 |
| Token Guard middleware (pre-check + post-consume) | 1 |
| Ledger writes: every consume, reset, bonus, refund | 0.5 |
| Daily reset cron job (midnight UTC) | 0.5 |
| Usage endpoint: GET /subscriptions/usage | 0.5 |

### Phase 10 — Subscription + Stripe (3 days)
| Task | Days |
|---|---|
| Stripe SDK integration + config | 0.5 |
| Plan service: list plans, get plan | 0.5 |
| Upgrade controller: create Stripe Checkout Session | 0.5 |
| Cancel controller: cancel at period end | 0.5 |
| Webhook handler: checkout.session.completed, invoice.paid, customer.subscription.deleted | 0.5 |
| Seed plans script (4 plans with Stripe price IDs) | 0.5 |

### Phase 11 — Docker + Testing + Deploy (3 days)
| Task | Days |
|---|---|
| Multi-stage Dockerfile (build + runtime) | 0.5 |
| docker-compose: app + MongoDB + Nginx | 0.5 |
| Nginx reverse proxy config | 0.5 |
| Unit tests: tokenizer, classifier, gap-scorer, rule-engine, token.service | 0.5 |
| Integration tests: optimize flow, feedback flow, subscription flow | 0.5 |
| Health check endpoint + startup scripts | 0.5 |

---

## 10. Response Shapes

### POST /api/prompts/optimize
```json
{
  "success": true,
  "data": {
    "promptId": "665a1b2c3d4e5f6a7b8c9d0e",
    "original": "write me a function that sorts an array",
    "optimized": "<role>You are a senior software engineer...</role>...",
    "score": 8,
    "suggestions": [
      "Add outputFormat: specify return type and format",
      "Strengthen constraints: add error handling requirements"
    ],
    "analysis": {
      "category": "coding",
      "complexity": "simple",
      "gaps": [
        { "element": "role", "severity": "ok" },
        { "element": "context", "severity": "ok" },
        { "element": "outputFormat", "severity": "weak" }
      ],
      "rulesApplied": ["add_role", "add_context", "structure_task", "add_constraints"],
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

### GET /api/subscriptions/usage
```json
{
  "success": true,
  "data": {
    "plan": "starter",
    "tokens": {
      "used": 12,
      "limit": 50,
      "remaining": 38,
      "resetsAt": "2026-03-22T00:00:00Z"
    },
    "billing": {
      "status": "active",
      "currentPeriodEnd": "2026-04-21T00:00:00Z",
      "cancelAtPeriodEnd": false
    },
    "history": {
      "totalOptimizations": 234,
      "averageScore": 7.8
    }
  }
}
```

### GET /api/subscriptions/plans
```json
{
  "success": true,
  "data": [
    {
      "id": "665a...",
      "name": "free",
      "displayName": "Free",
      "price": { "monthly": 0, "yearly": 0 },
      "tokensPerDay": 10,
      "features": ["10 tokens/day", "General model only", "Last 10 history"],
      "limits": {
        "historyRetention": 10,
        "rateLimit": 10,
        "targetModels": ["general"],
        "customTemplates": false
      }
    },
    {
      "id": "665b...",
      "name": "pro",
      "displayName": "Pro",
      "price": { "monthly": 2900, "yearly": 27800 },
      "tokensPerDay": 500,
      "features": ["500 tokens/day", "All models", "Unlimited history", "Custom templates"],
      "limits": {
        "historyRetention": -1,
        "rateLimit": 200,
        "targetModels": ["claude", "gpt", "general"],
        "customTemplates": true
      }
    }
  ]
}
```

---

## 11. Environment Variables

```env
# Server
NODE_ENV=development
PORT=3000

# MongoDB
MONGO_URI=mongodb://localhost:27017/gosha

# Cache
CACHE_TTL=3600

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_FREE=10
RATE_LIMIT_MAX_PRO=200

# Auth
API_KEY_SALT=change-this-to-random-string

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER_MONTHLY=price_...
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_ENTERPRISE_MONTHLY=price_...
STRIPE_PRICE_ENTERPRISE_YEARLY=price_...
```

---

## 12. Dependencies

### Production
| Package | Purpose |
|---|---|
| express (v5) | HTTP framework |
| mongoose | MongoDB ODM |
| zod | Runtime validation + TS type inference |
| node-cache | In-memory cache |
| pino + pino-pretty | Structured logging |
| express-rate-limit | Rate limiting |
| helmet | Security headers |
| cors | Cross-origin support |
| node-cron | Scheduled jobs (token reset, weight decay) |
| stripe | Stripe payment SDK |

### Development
| Package | Purpose |
|---|---|
| typescript | Compiler |
| tsx | Fast dev runner (esbuild-based) |
| vitest | Test runner |
| @types/* | Type definitions |

---

## 13. Cron Jobs

| Job | Schedule | What | Collection Affected |
|---|---|---|---|
| Token Reset | Daily 00:00 UTC | Set all users tokens.used=0, update lastResetAt | users |
| Weight Decay | Weekly Sunday 03:00 UTC | All learned_weights × 0.95 | learned_weights |

---

## 14. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| Cold start: no data → generic output | Medium | High (day 1) | Strong default rules. Seed 20-30 manually optimized examples |
| Rule ceiling: can't understand nuance | High | Medium | Expand rules over time. Track low-scoring prompts → add new rules. Future: optional AI provider as premium tier |
| Similarity search false positives | Medium | Low | Filter: category match + userScore≥7 + similarity>0.5 |
| Weight drift | Low | Low | Weekly decay ×0.95 + per-category isolation |
| Token gaming (abuse free tier) | Low | Medium | Rate limit + minimum text length + API key required |
| Stripe webhook missed | Medium | Low | Stripe retries 3 days. Implement idempotency keys. Manual reconciliation endpoint |
| Cache stale after weight update | Low | Medium | TTL 1hr. Weights update slowly, cache staleness is acceptable |

---

## 15. Future Enhancements (Post v1)

| Enhancement | Effort | Value |
|---|---|---|
| Optional AI provider (Claude API) as premium tier | 3 days | High |
| TF-IDF similarity instead of MongoDB $text | 2 days | Better matching |
| A/B testing: show 2 versions, track which scores higher | 3 days | Data-driven improvement |
| Auto-rule generation from top-scoring prompts | 5 days | Self-improving |
| SSE streaming for real-time optimization steps | 2 days | UX |
| Prompt versioning | 2 days | User value |
| Team accounts + shared history | 4 days | Enterprise value |
| Usage analytics dashboard (admin) | 3 days | Business insight |
| Webhook notifications on token depletion | 1 day | Developer UX |
| SDKs (npm package, Python client) | 3 days | Adoption |
