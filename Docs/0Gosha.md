# 0Gosha — Complete Project Plan (v2)

## Pure AI Agent Engine + Token System + Subscriptions + CLI

**Stack:** Node.js, Express, TypeScript, MongoDB, Redis, JWT (RS256), Stripe, Paymob, Docker
**Total:** 45 working days (~9 weeks, solo developer)
**Phases:** 12

---

## 1. What is 0Gosha?

A backend API + CLI tool that takes raw user text and optimizes it into a professional prompt for Claude/GPT. No AI API calls — the engine uses a pure rule-based system that learns from user feedback over time via MongoDB-stored weights.

### Core Value

| What | How |
|---|---|
| Prompt optimization | Rule engine + gap detection + model-specific formatting |
| Self-learning | Rule weights adjust from user ratings. Similarity search reuses past successes |
| Token-based billing | Users consume "0Gosha tokens" per optimization. Daily limit based on plan |
| Subscription plans | Free / Starter / Pro / Enterprise |
| Dual payments | Stripe (international) + Paymob (MENA/Egypt — Card + Mobile Wallet) |
| Auth | JWT RS256 (access + refresh tokens) with API key fallback |
| Cache | Redis (separate live/dev instances) |
| CLI | Terminal tool with local (offline) + remote (API) modes. Arg, pipe, interactive input |

---

## 2. Subscription Plans

| | Free | Starter | Pro | Enterprise |
|---|---|---|---|---|
| Price | $0 | $9/mo ($86/yr) | $29/mo ($278/yr) | $99/mo ($950/yr) |
| Tokens/Day | 10 | 50 | 500 | 5,000 |
| History | Last 10 | Last 100 | Unlimited | Unlimited |
| Target models | General | All | All | All |
| Rate limit | 10/hr | 30/hr | 200/hr | 1,000/hr |

### Token Cost Per Request

| Prompt Length | Complexity | Cost |
|---|---|---|
| ≤ 50 words | Simple | 1 token |
| 51-200 words | Medium | 3 tokens |
| 200+ words | Complex | 5 tokens |
| Cache hit | — | 0 tokens |

---

## 3. Agent Engine — 5 Internal Phases

**Phase A — ANALYZE:** Tokenizer → Classifier → Gap Scorer. Pure logic. Detects category, complexity, missing elements. Score 1-10.

**Phase B — LEARN:** MongoDB text search for similar high-scoring past prompts. Load per-rule learned weights for this category.

**Phase C — TRANSFORM:** 7 rules sorted by learned weight. Each adds missing structure. Model adapter formats for Claude (XML) / GPT (markdown) / general (brackets).

**Phase D — MERGE:** If similar high-scoring prompt found (score≥8, similarity>0.5), borrow structural sections.

**Phase E — RECORD:** Save to prompt_history. On user rating: boost/penalize rule weights. Weekly decay ×0.95.

### 7 Built-in Rules

| Rule | What |
|---|---|
| `add_role` | Category-specific role persona |
| `add_context` | Context section with detected intent |
| `structure_task` | Structured task block with focus areas |
| `add_constraints` | "Do NOT..." rules per category |
| `add_output_format` | Output format per category + model |
| `improve_specificity` | Replaces vague words |
| `add_quality_markers` | Quality requirements for complex prompts |

---

## 4. CLI Tool

### Usage

```bash
# Three input modes
0Gosha "optimize this prompt"              # argument
echo "my prompt" | 0Gosha                  # pipe
0Gosha                                     # interactive (multi-line, Ctrl+D)

# Two execution modes
0Gosha "text"                              # remote (default, API call)
0Gosha "text" --local                      # local (offline, needs MongoDB)

# Output options
0Gosha "text" --target claude              # target model
0Gosha "text" --json                       # raw JSON output
0Gosha "text" --copy                       # copy to clipboard
0Gosha "text" --output file.txt            # write to file
0Gosha "text" -q                           # quiet (prompt only, no UI)

# Utilities
0Gosha config set apiKey gsh_abc123        # save API key
0Gosha usage                               # check token balance
0Gosha history                             # view past optimizations
0Gosha rate <id> <score>                   # rate + teach the engine
```

### Config (`~/.0Gosharc`)

```json
{
  "apiKey": "gsh_abc123",
  "apiUrl": "https://api.0Gosha.io",
  "mode": "remote",
  "target": "general",
  "output": "pretty"
}
```

---

## 5. MongoDB Collections (7)

### users
```
{ _id, email (unique), password (hashed, select:false), apiKey (unique),
  plan, tokens: { used, limit, lastResetAt },
  subscription: { planId, status, currentPeriodStart, currentPeriodEnd,
    cancelAtPeriodEnd, paymentProvider, paymentMethod,
    externalCustomerId, externalSubscriptionId } | null }
Indexes: { email: 1 }, { apiKey: 1 }
```

### prompt_history
```
{ _id, originalText, optimizedText, category, targetModel, rulesApplied[],
  score, userScore, userId, keywords[], tokensCost }
Indexes: { originalText:'text', keywords:'text' },
         { category:1, userScore:-1 }, { userId:1, createdAt:-1 }
```

### learned_weights
```
{ _id, ruleId, category, weight (0.2-3.0), totalUses, totalScore, avgScore }
Index: { ruleId:1, category:1 } unique
```

### plans
```
{ _id, name (unique), displayName, price: { monthly, yearly },
  tokensPerDay, features[], limits: { historyRetention, rateLimit,
  targetModels[], customTemplates }, isActive }
```

### templates
```
{ _id, name, category, description, systemPrompt,
  exampleInput, exampleOutput, isActive }
Index: { category:1, isActive:1 }
```

### token_ledger
```
{ _id, userId, amount, action (optimize|reset|bonus|refund),
  promptId, balanceAfter, metadata }
Indexes: { userId:1, createdAt:-1 }, { createdAt:1 } TTL 90 days
```

### payment_history
```
{ _id, userId, planId, amount (cents), currency (usd|egp),
  status, provider (stripe|paymob), method (card|wallet|null),
  externalPaymentId }
Index: { userId:1, createdAt:-1 }
```

---

## 6. API Endpoints (16)

| Method | Endpoint | Auth | Tokens |
|---|---|---|---|
| POST | /api/prompts/optimize | Yes | Yes |
| GET | /api/prompts/history | Yes | No |
| GET | /api/prompts/:id | Yes | No |
| PATCH | /api/prompts/:id/rate | Yes | No |
| POST | /api/users/register | No | No |
| POST | /api/users/login | No | No |
| POST | /api/users/refresh | No | No |
| GET | /api/users/me | Yes | No |
| GET | /api/templates | Optional | No |
| GET | /api/templates/:id | Optional | No |
| GET | /api/subscriptions/plans | No | No |
| POST | /api/subscriptions/upgrade | Yes | No |
| POST | /api/subscriptions/cancel | Yes | No |
| GET | /api/subscriptions/usage | Yes | No |
| POST | /api/webhooks/stripe | Stripe sig | No |
| POST | /api/webhooks/paymob | HMAC | No |

---

## 7. Project Structure

```
0Gosha/
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── nginx/default.conf
├── src/
│   ├── config/
│   │   ├── env.ts
│   │   ├── db.ts
│   │   └── cache.ts
│   ├── shared/
│   │   ├── errors/
│   │   │   ├── AppError.ts
│   │   │   └── errorHandler.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── tokenGuard.middleware.ts
│   │   │   ├── rateLimiter.middleware.ts
│   │   │   └── validate.middleware.ts
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   ├── pagination.ts
│   │   │   └── hashText.ts
│   │   └── types/
│   │       └── common.types.ts
│   ├── agent/
│   │   ├── @types/index.ts
│   │   ├── tokenizer.ts
│   │   ├── classifier.ts
│   │   ├── gap-scorer.ts
│   │   ├── rule-engine.ts
│   │   ├── model-adapter.ts
│   │   ├── learner.ts
│   │   ├── merger.ts
│   │   ├── agent-engine.ts
│   │   ├── learned-weight.model.ts
│   │   └── index.ts
│   ├── modules/
│   │   ├── prompt/
│   │   │   ├── controller/ (optimize, history, detail, rate)
│   │   │   ├── service/prompt.service.ts
│   │   │   ├── prompt.model.ts
│   │   │   ├── prompt.dto.ts
│   │   │   ├── prompt.router.ts
│   │   │   └── index.ts
│   │   ├── user/
│   │   │   ├── controller/ (register, login, refresh, me)
│   │   │   ├── service/user.service.ts
│   │   │   ├── user.model.ts
│   │   │   ├── user.dto.ts
│   │   │   ├── user.router.ts
│   │   │   └── index.ts
│   │   ├── template/
│   │   │   ├── controller/ (list, detail)
│   │   │   ├── service/template.service.ts
│   │   │   ├── template.model.ts
│   │   │   ├── template.dto.ts
│   │   │   ├── template.router.ts
│   │   │   └── index.ts
│   │   └── subscription/
│   │       ├── controller/ (plans, upgrade, cancel, usage)
│   │       ├── service/ (subscription, stripe, paymob, token)
│   │       ├── subscription.model.ts
│   │       ├── subscription.dto.ts
│   │       ├── subscription.router.ts
│   │       ├── webhook.router.ts
│   │       └── index.ts
│   ├── cli/
│   │   ├── index.ts
│   │   ├── commands/ (optimize, config, usage, history, rate)
│   │   ├── lib/ (input, config-store, remote-client, local-engine, output)
│   │   └── types.ts
│   ├── jobs/
│   │   ├── resetTokens.job.ts
│   │   └── decayWeights.job.ts
│   ├── app.ts
│   └── server.ts
├── scripts/ (seed-plans, seed-weights, seed-templates)
├── tests/
├── .env.example
├── .gitignore
├── .dockerignore
├── tsconfig.json
├── package.json
└── README.md
```

---

## 8. All 12 Phases — Detailed

---

### Phase 1 — Setup & Infrastructure (4 days) ✅ COMPLETE

| Task | Days |
|---|---|
| Express + TS + ESM scaffold, strict tsconfig | 0.5 |
| Env validation with Zod (31 vars: Stripe + Paymob + JWT keys) | 0.5 |
| Pino structured logger | 0.5 |
| Central error handler + AppError class | 0.5 |
| Redis cache wrapper (env-based live/dev switching) | 0.5 |
| hashText utility for cache keys | 0.5 |
| Middleware: JWT RS256 auth + API key fallback, rateLimiter, validate | 1 |

**Output:** 14 files. Config, errors, middleware, utils, types all working.

---

### Phase 2 — Database Models & Schemas (4 days) ✅ COMPLETE

| Task | Days |
|---|---|
| Agent types (@types/index.ts — all shared interfaces) | 0.5 |
| users model (password hash, tokens embed, subscription embed) | 0.5 |
| prompt_history model + text index for similarity search | 0.5 |
| learned_weights model + compound unique index | 0.5 |
| plans model | 0.5 |
| token_ledger model + TTL index 90 days | 0.5 |
| payment_history model (dual provider/currency) | 0.5 |
| templates model + category index | 0.5 |

**Output:** 8 files. 7 collections, 10 indexes.

---

### Phase 3 — Analyzer: Tokenizer + Classifier + Gap Scorer (3 days) ← YOU ARE HERE

| Task | Days |
|---|---|
| Tokenizer: 120+ stop words, 40+ action verbs (weight 3), 60+ domain keywords (weight 2), tokenize + extractKeywords with dedup + sort | 1 |
| Classifier: 5 category keyword maps (30+ words each), score-based classification (threshold ≥3), complexity from word count + action count, intent from top 5 keywords | 1 |
| Gap Scorer: 6 element detectors (role/context/task/constraints/format/examples), strong regex → ok, weak regex → weak, none → missing, weighted score 1-10 | 1 |

**Output:** 3 files. Pure logic, no DB, no network.

**Key details:**
- Tokenizer: 3 tiers — action verbs (weight 3), domain keywords (weight 2), other (weight 1), stop words (weight 0)
- Classifier: Scores each of 5 categories by keyword match. Highest ≥ 3 wins, else "general". Complexity from word count (≤30 simple, 31-80 medium, >80 complex) + action count
- Gap Scorer: 6 regex-based detectors. Each element has strong patterns (→ ok) and weak patterns (→ weak). Raw score weighted: task=2.5, context=2.0, role=1.5, constraints=1.5, format=1.5, examples=1.0

---

### Phase 4 — Rule Engine + Transform (6 days)

| Task | Days |
|---|---|
| Rule interface + engine core (condition check, weight sorting, sequential apply) | 1 |
| add_role rule (per-category role templates) | 0.5 |
| add_context rule (intent injection) | 0.5 |
| structure_task rule (task block with focus areas) | 0.5 |
| add_constraints rule (per-category "Do NOT" sets) | 0.5 |
| add_output_format rule (per-category + per-model formatting) | 0.5 |
| improve_specificity rule (vague word replacement map) | 0.5 |
| add_quality_markers rule (quality reqs for complex prompts) | 0.5 |
| Model adapter: XML (Claude) / Markdown (GPT) / Bracket (general) section formatting | 1 |
| Merger: section extraction + structural blending with learned patterns | 0.5 |

**Output:** 4 files (rule-engine.ts, model-adapter.ts, merger.ts + rules can be inline or separate).

**Key details:**
- Rules are sorted by learned weight before execution — highest weight fires first
- Each rule has: `condition(analysis) → boolean` and `apply(text, analysis, target) → string`
- Model adapter wraps sections differently: `<role>` for Claude, `## Role` for GPT, `[ROLE]` for general
- Merger extracts tagged sections from learned prompts and appends missing ones to current output

---

### Phase 5 — Learner + Similarity Search (4 days)

| Task | Days |
|---|---|
| Similarity search via MongoDB $text + score threshold filtering | 1 |
| Weight loader with category filter | 0.5 |
| Record result: save to prompt_history + increment rule usage counts | 0.5 |
| Feedback handler: weight boost (+0.1) / penalize (-0.05) + cap (3.0) / floor (0.2) | 1 |
| Weight decay cron job (weekly × 0.95) | 0.5 |
| Weight initialization script (seed all rules × all categories) | 0.5 |

**Output:** 2 files (learner.ts, learned-weight.model.ts already from Phase 2).

**Key details:**
- `findSimilar()`: MongoDB `$text` search on prompt_history, filtered by category + userScore≥7, similarity threshold >0.3
- `getWeights()`: Load all weights for a category, used by rule engine to sort rules
- `applyFeedback()`: score≥7 → boost +0.1, score<5 → penalize -0.05, else neutral. Cap 3.0, floor 0.2
- `initWeights()`: bulkWrite upsert — one record per rule × category

---

### Phase 6 — Agent Engine Integration + Feedback (3 days)

| Task | Days |
|---|---|
| Agent engine orchestrator: wire Analyze → Learn → Transform → Merge → Record | 1 |
| Score final output by re-analyzing optimized text | 0.5 |
| Suggestion builder from remaining gaps | 0.5 |
| Token cost calculator (word count → 1/3/5) | 0.5 |
| End-to-end integration test of full agent loop | 0.5 |

**Output:** 2 files (agent-engine.ts, index.ts barrel).

**Key details:**
- `process(input)`: Full pipeline — analyze → learn (parallel: weights + similar) → transform → merge → score → record → return
- `feedback(promptId, score)`: Delegates to learner.applyFeedback
- `calcTokenCost(text)`: ≤50 words=1, ≤200=3, >200=5
- `init()`: Called on server startup — initializes all rule×category weight records

---

### Phase 7 — Cache Layer (2 days)

| Task | Days |
|---|---|
| Hash-based cache key generation (normalized text + target model) | 0.5 |
| Redis cache check before agent engine, cache write after | 0.5 |
| Cache invalidation: TTL 1hr, bust on same-text re-optimize | 0.5 |
| Weight cache in Redis: load weights once per 5min, not per request | 0.5 |

**Output:** Updates to prompt.service.ts (wraps agent calls with cache).

**Key details:**
- Cache key: `prompt:<hash(text)>:<targetModel>` → e.g., `prompt:a3b1c9f2e8d4a7b0:claude`
- Cache hit → return immediately, 0 token cost
- Weight cache: store category weights in Redis with 5min TTL, avoids DB read per request

---

### Phase 8 — API Routes + Controllers (4 days)

| Task | Days |
|---|---|
| Prompt module: 4 controllers + service + DTOs + router (optimize, history, detail, rate) | 1 |
| User module: 4 controllers + service + DTOs + router (register, login, refresh, me) | 1.5 |
| Template module: 2 controllers + service + DTO + router (list, detail) | 0.5 |
| app.ts wiring + server.ts + graceful shutdown (MongoDB + Redis) | 0.5 |

**Output:** ~25 files across 3 modules + app + server.

**Key details:**
- Controllers are thin — call service, return response. No business logic.
- Prompt router: `POST /optimize` has auth → tokenGuard → validate → tokenConsume → controller pipeline
- User service: register (create + sign JWT + gen API key), login (verify + sign), refresh (verify refresh → new pair)
- app.ts: helmet, cors, rateLimiter, webhook router (before JSON parser), JSON parser, module routers, errorHandler

---

### Phase 9 — Token System (4 days)

| Task | Days |
|---|---|
| Token service: consume(), checkBudget(), resetAll(), getUsage() | 1 |
| Token cost calculator integration (word count → complexity → cost) | 0.5 |
| Token Guard middleware (pre-check budget + post-consume after response) | 1 |
| Ledger writes: every consume, reset, bonus, refund | 0.5 |
| Daily token reset cron (midnight UTC) + lazy reset in guard | 0.5 |
| Usage endpoint: GET /subscriptions/usage | 0.5 |

**Output:** 3 files (token.service.ts, tokenGuard.middleware.ts, resetTokens.job.ts).

**Key details:**
- Token Guard: sits between auth and controller. Pre-check: estimate cost, reject if over budget. Post-consume: intercept response, consume actual tokens, attach usage to response
- Lazy reset: if `lastResetAt` < today UTC → reset counter before checking budget
- Cron backup: nightly bulk reset all users for consistency

---

### Phase 10 — Subscriptions + Payments (4 days)

| Task | Days |
|---|---|
| Stripe service: checkout session, webhook handler (checkout.completed, invoice.paid, subscription.deleted) | 1 |
| Paymob service: payment intention, iframe URL, HMAC verification, callback handler | 1 |
| Subscription service: route to Stripe/Paymob based on provider param, plan listing, cancel | 0.5 |
| 4 controllers (plans, upgrade, cancel, usage) + router | 0.5 |
| Webhook router: Stripe (raw body + signature) + Paymob (JSON + HMAC) | 0.5 |
| Seed plans script (4 plans with pricing) | 0.5 |

**Output:** ~10 files across subscription module.

**Key details:**
- Upgrade routes to Stripe or Paymob based on `provider` field in request body
- Stripe: creates Checkout Session → returns `checkoutUrl`
- Paymob: creates Payment Intention → returns `paymentUrl` + `iframeUrl` (card or wallet integration)
- Webhooks: Stripe uses signature verification, Paymob uses HMAC verification
- On success: update user.plan, user.tokens.limit, create payment_history

---

### Phase 11 — Docker + Testing (3 days)

| Task | Days |
|---|---|
| Multi-stage Dockerfile (build + runtime, node:20-alpine) | 0.5 |
| docker-compose: app + MongoDB + Redis + Nginx | 0.5 |
| Nginx reverse proxy config | 0.5 |
| Unit tests: tokenizer, classifier, gap-scorer, rule-engine, token.service | 0.5 |
| Integration tests: optimize flow, feedback flow, subscription flow | 0.5 |
| Health check endpoint + seed scripts | 0.5 |

**Output:** 5 files (Dockerfile, compose, nginx.conf, test files).

---

### Phase 12 — CLI Tool (3 days)

| Task | Days |
|---|---|
| CLI entry point + Commander.js arg parser + command routing | 0.5 |
| Input resolver: detect argument / pipe / interactive mode | 0.5 |
| Config store (~/.0Gosharc): read/write JSON, set/get/list/reset | 0.5 |
| Remote client: HTTP calls to 0Gosha API with API key | 0.5 |
| Local engine wrapper: import AgentEngine directly + connect local MongoDB | 0.5 |
| Output formatter: pretty (chalk), JSON, clipboard (clipboardy), file write | 0.25 |
| Utility commands: usage, history, rate | 0.25 |

**Output:** 12 files in src/cli/.

**Key details:**
- 3 input modes: argument (`0Gosha "text"`), pipe (`echo "text" | 0Gosha`), interactive (`0Gosha` → prompt)
- 2 execution modes: remote (API call, default) + local (import AgentEngine, needs MongoDB)
- Detection: `!process.stdin.isTTY` → pipe mode. Args present → arg mode. Neither → interactive
- Config: `~/.0Gosharc` JSON file. CLI flags override config. Config overrides defaults.
- New deps: commander, chalk, ora, inquirer, clipboardy

---

## 9. Environment Variables (31)

```env
# Server
NODE_ENV=development
PORT=3000

# MongoDB
MONGO_URI=XXXX

# Cache
CACHE_TTL=3600
REDIS_CACHE_LIVE=XXXX
REDIS_CACHE_DEV=XXXX

# Rate Limiting
RATE_LIMIT_WINDOW_MS=3600000
RATE_LIMIT_MAX_FREE=10
RATE_LIMIT_MAX_PRO=200

# Auth
API_KEY_SALT=XXXX
ACCESS_PUBLICE_KEY=XXXX
ACCESS_PRAIVET_KEY=XXXX
REFRSH_PUBLICE_KEY=XXXX
REFRSH_PRAIVET_KEY=XXXX

# Stripe
STRIPE_SECRET_KEY=XXXX
STRIPE_WEBHOOK_SECRET=XXXX
STRIPE_PRICE_STARTER_MONTHLY=XXXX
STRIPE_PRICE_STARTER_YEARLY=XXXX
STRIPE_PRICE_PRO_MONTHLY=XXXX
STRIPE_PRICE_PRO_YEARLY=XXXX
STRIPE_PRICE_ENTERPRISE_MONTHLY=XXXX
STRIPE_PRICE_ENTERPRISE_YEARLY=XXXX

# Paymob
PAYMOB_API=XXXX
PAYMOB_API_INTENTION=XXXX
PAYMOB_iframes_id=XXXX
Paymob_API_Key=XXXX
Paymob_Secret_Key=XXXX
Paymob_Public_Key=XXXX
Paymob_integration_id_Card=XXXX
Paymob_integration_id_Wallet=XXXX
PAYMOB_HMAC=XXXX
```

---

## 10. Dependencies

### Production

| Package | Purpose |
|---|---|
| express (v5) | HTTP framework |
| mongoose | MongoDB ODM |
| redis | Redis client |
| jsonwebtoken | JWT RS256 sign/verify |
| zod | Runtime validation + TS inference |
| stripe | Stripe SDK |
| pino + pino-pretty | Structured logging |
| express-rate-limit | Rate limiting |
| helmet | Security headers |
| cors | Cross-origin |
| node-cron | Cron jobs (token reset, weight decay) |
| commander | CLI arg parsing |
| chalk | CLI colored output |
| ora | CLI spinners |
| inquirer | CLI interactive prompts |
| clipboardy | CLI clipboard access |

### Development

| Package | Purpose |
|---|---|
| typescript | Compiler |
| tsx | Fast dev runner |
| vitest | Test runner |
| @types/* | Type definitions |

---

## 11. Cron Jobs

| Job | Schedule | What |
|---|---|---|
| Token Reset | Daily 00:00 UTC | Reset all users tokens.used=0 |
| Weight Decay | Weekly Sunday 03:00 UTC | All learned_weights × 0.95 |

---

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Cold start: no data → generic output | Medium | Strong default rules + seed 20-30 example prompts |
| Rule ceiling: can't understand nuance | High | Expand rules. Future: optional AI provider as premium tier |
| Similarity search false positives | Medium | Filter: category + userScore≥7 + similarity>0.5 |
| Weight drift | Low | Weekly decay ×0.95 + per-category isolation |
| Token gaming | Low | Rate limit + min text length + auth required |
| Stripe webhook missed | Medium | Stripe retries 3 days + idempotency keys |
| Paymob webhook missed | Medium | HMAC verify + idempotency on transaction ID |
| JWT key compromise | High | Short-lived access (15m) + refresh rotation + RSA keys in env |
| Redis downtime | Medium | Fallback: skip cache, process directly. Auto-reconnect |
| CLI local mode DB mismatch | Low | Same Mongoose schemas. Document local mode requirements |

---

## 13. Timeline Summary

| Phase | Days | Cumulative | Status |
|---|---|---|---|
| 1. Setup & Infrastructure | 4 | 4 | ✅ Complete |
| 2. Database Models | 4 | 8 | ✅ Complete |
| 3. Analyzer (Tokenizer + Classifier + Gap Scorer) | 3 | 11 | ← Current |
| 4. Rule Engine + Transform | 6 | 17 | |
| 5. Learner + Similarity Search | 4 | 21 | |
| 6. Agent Engine Integration | 3 | 24 | |
| 7. Cache Layer | 2 | 26 | |
| 8. API Routes + Controllers | 4 | 30 | |
| 9. Token System | 4 | 34 | |
| 10. Subscriptions + Payments | 4 | 38 | |
| 11. Docker + Testing | 3 | 41 | |
| 12. CLI Tool | 3 | 44 | |
| Buffer | 1 | **45** | |

**Total: 45 working days (~9 weeks)**

---

## 14. Future Enhancements (Post v1)

| Enhancement | Effort | Value |
|---|---|---|
| Optional AI provider (Claude API) as premium tier | 3 days | High |
| TF-IDF similarity instead of MongoDB $text | 2 days | Better matching |
| A/B testing: 2 optimized versions, track which scores higher | 3 days | Data-driven |
| Auto-rule generation from top-scoring prompts | 5 days | Self-improving |
| SSE streaming for real-time optimization steps | 2 days | UX |
| Prompt versioning | 2 days | User value |
| Team accounts + shared history | 4 days | Enterprise |
| Admin analytics dashboard | 3 days | Business |
| CLI plugins (custom rules, custom output formats) | 3 days | Extensibility |
| SDKs (npm package, Python client) | 3 days | Adoption |
