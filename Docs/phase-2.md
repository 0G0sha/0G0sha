# Phase 2 — Database Models & Schemas (Plan)

**Duration:** 4 days
**Depends on:** Phase 1 (config/env.ts, config/db.ts, shared/errors/AppError.ts)

---

## Overview

Phase 2 creates all 7 MongoDB collections with Mongoose schemas, indexes, embedded documents, and helper methods. These models are the data backbone — every module from Phase 3 onward reads/writes through them.

---

## Files to Create (8 files)

```
src/
├── agent/
│   └── @types/
│       └── index.ts                → Agent type definitions (shared across engine + models)
├── modules/
│   ├── user/
│   │   └── user.model.ts           → User schema (password, tokens, subscription embedded)
│   ├── prompt/
│   │   └── prompt.model.ts         → PromptHistory schema (text indexes for similarity)
│   ├── template/
│   │   └── template.model.ts       → Template schema (category index)
│   └── subscription/
│       └── subscription.model.ts   → Plan + TokenLedger + PaymentHistory (3 schemas, 1 file)
└── agent/
    └── learned-weight.model.ts     → LearnedWeight schema (compound unique index)
```

---

## Task Breakdown (4 days)

| # | Task | Days | Detail |
|---|------|------|--------|
| 1 | Agent types (`@types/index.ts`) | 0.5 | All shared types: TargetModel, PromptCategory, AnalysisResult, AgentInput/Output, etc. Used by models + engine |
| 2 | User model | 0.5 | Email, hashed password (select:false), apiKey, plan, tokens (embedded), subscription (embedded), `comparePassword()`, `generateApiKey()` |
| 3 | PromptHistory model | 0.5 | originalText, optimizedText, category, rulesApplied, score/userScore, userId, keywords. Text index on `originalText + keywords` for similarity search |
| 4 | LearnedWeight model | 0.5 | ruleId, category, weight, totalUses, totalScore, avgScore. Compound unique index `{ ruleId, category }` |
| 5 | Plan model | 0.5 | name, displayName, price (monthly/yearly), tokensPerDay, features[], limits (embedded), isActive |
| 6 | TokenLedger model | 0.5 | userId, amount, action (enum), promptId, balanceAfter, metadata. TTL index: auto-delete after 90 days |
| 7 | PaymentHistory model | 0.5 | userId, planId, amount, currency (usd/egp), status, provider (stripe/paymob), method (card/wallet), externalPaymentId |
| 8 | Template model | 0.5 | name, category, description, systemPrompt, exampleInput, exampleOutput, isActive. Index on `{ category, isActive }` |

---

## Collection Designs

### 1. `users`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `email` | String | Yes | unique, lowercase, trimmed |
| `password` | String | Yes | SHA-256 hashed with API_KEY_SALT. `select: false` — never returned in queries by default |
| `apiKey` | String | Yes | unique, format: `gsh_<64 hex chars>` |
| `plan` | String (enum) | Yes | `free` / `starter` / `pro` / `enterprise`, default: `free` |
| `tokens` | Embedded | Yes | `{ used: Number, limit: Number, lastResetAt: Date }` |
| `subscription` | Embedded or null | No | `{ planId, status, currentPeriodStart/End, cancelAtPeriodEnd, paymentProvider, paymentMethod, externalCustomerId, externalSubscriptionId }` |
| `createdAt` | Date | Auto | Mongoose timestamps |
| `updatedAt` | Date | Auto | Mongoose timestamps |

**Indexes:**
- `{ email: 1 }` — unique, for login lookup
- `{ apiKey: 1 }` — unique, for auth middleware lookup

**Instance methods:**
- `comparePassword(candidate: string): boolean` — hashes candidate + salt, compares with stored hash

**Static helpers:**
- `generateApiKey(): string` — returns `gsh_<randomBytes(32).hex>`

**Why `select: false` on password:** Prevents accidental password leaks. Every query must explicitly opt-in with `.select('+password')`.

**Why embedded `tokens` and `subscription` instead of separate collections:** Always read together with the user. Separate collections = extra queries. Embedded = one document, one read.

---

### 2. `prompt_history`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `originalText` | String | Yes | Raw user input |
| `optimizedText` | String | Yes | Agent output |
| `category` | String | Yes | `coding` / `writing` / `analysis` / `marketing` / `general` |
| `targetModel` | String | Yes | `claude` / `gpt` / `general` |
| `rulesApplied` | String[] | Yes | IDs of rules that fired |
| `score` | Number | Yes | Agent-calculated score (1-10) |
| `userScore` | Number or null | No | Explicit user rating (1-10), null until rated |
| `userId` | ObjectId (ref: User) | No | Who optimized it. Null for anonymous |
| `keywords` | String[] | No | Extracted keywords for search |
| `tokensCost` | Number | Yes | How many Gosha tokens this cost (1/3/5) |
| `createdAt` | Date | Auto | |
| `updatedAt` | Date | Auto | |

**Indexes:**
- `{ originalText: 'text', keywords: 'text' }` — MongoDB text index for similarity search (Phase 5 learner)
- `{ category: 1, userScore: -1 }` — find high-scoring prompts per category
- `{ userId: 1, createdAt: -1 }` — user history endpoint (paginated, newest first)

**Why text index on `originalText + keywords`:** The learner searches for similar past prompts using `$text: { $search: userInput }`. MongoDB scores results by relevance. Keywords boost matching because they carry more semantic weight than the full text.

---

### 3. `learned_weights`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `ruleId` | String | Yes | e.g. `add_role`, `add_constraints` |
| `category` | String | Yes | e.g. `coding`, `writing` |
| `weight` | Number | Yes | Default 1.0, range 0.2 - 3.0 |
| `totalUses` | Number | Yes | How many times this rule ran for this category |
| `totalScore` | Number | Yes | Sum of all user scores for prompts using this rule |
| `avgScore` | Number | Yes | `totalScore / totalUses` |

**Indexes:**
- `{ ruleId: 1, category: 1 }` — unique compound. One weight per rule per category.

**Why compound unique:** Each rule has independent weights per category. `add_role` might have weight 2.1 for `coding` but 1.3 for `writing`. The compound index enforces exactly one record per pair.

**Why `totalScore` and `totalUses` instead of just `avgScore`:** Can't compute a running average from just the average — you need the components. When a new score comes in: `totalScore += score`, `totalUses += 1`, `avgScore = totalScore / totalUses`.

---

### 4. `plans`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | String | Yes | unique: `free` / `starter` / `pro` / `enterprise` |
| `displayName` | String | Yes | `Free` / `Starter` / `Pro` / `Enterprise` |
| `price` | Embedded | Yes | `{ monthly: Number, yearly: Number }` in cents |
| `tokensPerDay` | Number | Yes | Daily token limit for this plan |
| `features` | String[] | No | Human-readable feature list for API response |
| `limits` | Embedded | Yes | `{ historyRetention, rateLimit, targetModels[], customTemplates }` |
| `isActive` | Boolean | Yes | Soft delete — deactivated plans stay in DB |

**Why stored in DB, not hardcoded:** Plans will change — new prices, new tiers, A/B testing. DB storage = update without redeploying. The seed script initializes the 4 plans.

**Why `limits` is embedded:** Always read together with the plan. No point in a separate collection for 4 records.

---

### 5. `token_ledger`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | ObjectId (ref: User) | Yes | Who consumed/received tokens |
| `amount` | Number | Yes | Positive = consumed, negative = refund/bonus |
| `action` | String (enum) | Yes | `optimize` / `reset` / `bonus` / `refund` |
| `promptId` | ObjectId (ref: PromptHistory) or null | No | Which prompt consumed tokens (null for reset/bonus) |
| `balanceAfter` | Number | Yes | Remaining tokens after this action |
| `metadata` | Mixed | No | Flexible: coupon code, admin note, etc. |
| `createdAt` | Date | Auto | |

**Indexes:**
- `{ userId: 1, createdAt: -1 }` — user's ledger history
- `{ createdAt: 1 }, expireAfterSeconds: 7776000` — **TTL index: auto-delete after 90 days**

**Why TTL 90 days:** Ledger entries accumulate fast (every optimize + daily resets). After 90 days, individual entries are useless — aggregate stats are enough. MongoDB auto-deletes expired docs.

**Why `balanceAfter`:** Quick audit. If a user says "I had 30 tokens, now I have 0" — you can see the exact sequence of events without recalculating.

---

### 6. `payment_history`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `userId` | ObjectId (ref: User) | Yes | Who paid |
| `planId` | ObjectId (ref: Plan) | Yes | Which plan |
| `amount` | Number | Yes | In cents |
| `currency` | String (enum) | Yes | `usd` / `egp` |
| `status` | String (enum) | Yes | `succeeded` / `failed` / `refunded` |
| `provider` | String (enum) | Yes | `stripe` / `paymob` |
| `method` | String (enum) or null | No | `card` / `wallet` / null |
| `externalPaymentId` | String | Yes | Stripe payment_intent ID or Paymob transaction ID |
| `createdAt` | Date | Auto | |

**Indexes:**
- `{ userId: 1, createdAt: -1 }` — user's payment history

**Why `currency` field:** Stripe charges in USD, Paymob in EGP. Need to track which currency each payment used for accounting.

---

### 7. `templates`

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `name` | String | Yes | e.g. "Code Review", "Blog Post Writer" |
| `category` | String | Yes | `coding` / `writing` / `analysis` / `marketing` / `general` |
| `description` | String | Yes | Short description |
| `systemPrompt` | String | Yes | The template's system prompt text |
| `exampleInput` | String | Yes | Example of what the user would input |
| `exampleOutput` | String | Yes | Example of what the output looks like |
| `isActive` | Boolean | Yes | Soft delete |
| `createdAt` | Date | Auto | |

**Indexes:**
- `{ category: 1, isActive: 1 }` — filter templates by category (only active)

---

## Agent Types (Foundation)

Before models, we need the shared type definitions that both the agent engine and models reference:

```typescript
// Types to define in src/agent/@types/index.ts:

TargetModel      = 'claude' | 'gpt' | 'general'
PromptCategory   = 'coding' | 'writing' | 'analysis' | 'marketing' | 'general'
PromptComplexity = 'simple' | 'medium' | 'complex'
PromptElement    = 'role' | 'context' | 'task' | 'constraints' | 'outputFormat' | 'examples'

Token            = { word, isKeyword, weight }
PromptGap        = { element, severity: 'missing' | 'weak' | 'ok' }
AnalysisResult   = { tokens, keywords, category, complexity, intent, gaps, rawScore }

TransformRule    = { id, name, element, condition(), apply() }
LearnedWeight    = { ruleId, category, weight, totalUses, avgScore }
SimilarPrompt    = { originalText, optimizedText, score, category, rulesApplied, similarity }

AgentInput       = { text, targetModel, userId? }
AgentOutput      = { promptId, original, optimized, score, suggestions, analysis }
```

**Why define now:** Models import these types (e.g., `PromptCategory` in prompt.model.ts). Agent engine imports them later. Single source of truth.

---

## Index Strategy

| Collection | Index | Type | Purpose |
|------------|-------|------|---------|
| users | `{ email: 1 }` | Unique | Login lookup |
| users | `{ apiKey: 1 }` | Unique | Auth middleware lookup |
| prompt_history | `{ originalText: 'text', keywords: 'text' }` | Text | Similarity search ($text query) |
| prompt_history | `{ category: 1, userScore: -1 }` | Compound | Find best prompts per category |
| prompt_history | `{ userId: 1, createdAt: -1 }` | Compound | User history (paginated) |
| learned_weights | `{ ruleId: 1, category: 1 }` | Unique compound | One weight per rule × category |
| token_ledger | `{ userId: 1, createdAt: -1 }` | Compound | User ledger history |
| token_ledger | `{ createdAt: 1 }` | TTL (90 days) | Auto-cleanup old entries |
| payment_history | `{ userId: 1, createdAt: -1 }` | Compound | User payment history |
| templates | `{ category: 1, isActive: 1 }` | Compound | Filter by category |

**Total: 10 indexes across 7 collections.**

---

## Embedded vs. Separate Collection Decisions

| Data | Decision | Why |
|------|----------|-----|
| `user.tokens` | **Embedded** | Always read with user. Updated on every optimize request. Separate collection = N+1 queries |
| `user.subscription` | **Embedded** | Read with user on every auth check. Only 1 subscription per user. No point in separate collection |
| `plan.limits` | **Embedded** | Always read with plan. Only 4 plan records total |
| `plan.price` | **Embedded** | Same — always read together |
| Token ledger entries | **Separate collection** | Grows unbounded (every optimize + daily resets). TTL index for auto-cleanup. Would bloat user document if embedded |
| Payment history | **Separate collection** | Grows over time. Needs independent querying for admin/reporting |

---

## Relationships

```
users._id ──←── prompt_history.userId
users._id ──←── token_ledger.userId
users._id ──←── payment_history.userId
plans._id ──←── users.subscription.planId
plans._id ──←── payment_history.planId
prompt_history._id ──←── token_ledger.promptId
```

All references use `Schema.Types.ObjectId` with `ref` for potential `.populate()`. But in practice, we use `.lean()` and avoid populate for performance — joins are done at the service layer when needed.

---

## What Phase 2 Enables

| Phase | What it can do after Phase 2 |
|-------|------------------------------|
| Phase 3 (Analyzer) | Uses `PromptCategory`, `PromptComplexity` types from `@types/index.ts` |
| Phase 4 (Rule Engine) | Uses `TransformRule`, `LearnedWeight` types |
| Phase 5 (Learner) | Queries `prompt_history` (text search), reads/writes `learned_weights` |
| Phase 6 (Agent Engine) | Writes to `prompt_history` via learner |
| Phase 8 (API Routes) | All CRUD operations on all 7 collections |
| Phase 9 (Token System) | Reads/writes `users.tokens`, creates `token_ledger` entries |
| Phase 10 (Subscriptions) | Reads `plans`, writes `users.subscription`, creates `payment_history` |

---

## Verification Checklist

After Phase 2 is coded, you should be able to:

- [x] All 7 collections defined with Mongoose schemas
- [x] All 10 indexes created (including text index and TTL)
- [x] Agent types defined and importable
- [x] `user.comparePassword()` works (hash + compare)
- [x] `generateApiKey()` returns `gsh_<hex>` format
- [x] `select: false` on password field works (not returned in default queries)
- [x] Embedded docs (`tokens`, `subscription`, `limits`, `price`) have `_id: false`
- [x] All enum fields have proper validation
- [x] timestamps enabled on all collections that need them
- [x] TTL index on token_ledger set to 90 days

---

## Next: Phase 3

Phase 3 builds the Analyzer — the first component of the agent engine: Tokenizer, Classifier, and Gap Scorer. Pure logic, no DB, no external calls.
