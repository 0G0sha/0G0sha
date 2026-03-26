# Phase 3 — Analyzer: Tokenizer + Classifier + Gap Scorer (Plan)

**Duration:** 3 days
**Depends on:** Phase 2 (agent `@types/index.ts` for shared types)
**External dependencies:** None — pure logic, no DB, no AI, no network

---

## Overview

The Analyzer is the **first step of every optimization request**. It takes raw user text and produces an `AnalysisResult` — a structured understanding of what the user wants, what category it falls into, how complex it is, and what's missing from their prompt.

Three components, executed in sequence:

```
Raw Text → Tokenizer → Classifier → Gap Scorer → AnalysisResult
```

All three are stateless, pure-function classes. No database reads, no API calls. They run in <1ms on any text.

---

## Files to Create (3 files)

```
src/
└── agent/
    ├── tokenizer.ts       → Text → Token[] + keyword extraction
    ├── classifier.ts      → Keyword scoring → category + complexity + intent
    └── gap-scorer.ts      → Regex pattern matching → PromptGap[] + rawScore
```

**Types used from Phase 2:** `Token`, `PromptCategory`, `PromptComplexity`, `PromptElement`, `PromptGap`, `AnalysisResult` (all from `src/agent/@types/index.ts`).

---

## Task Breakdown (3 days)

| # | Task | Days | Detail |
|---|------|------|--------|
| 1 | Tokenizer | 1 | Stop word set (120+), action verb set (40+), domain keyword set (60+), weight calculation, keyword extraction with dedup + sort |
| 2 | Classifier | 1 | Category keyword maps (5 categories × 30+ keywords each), scoring algorithm, complexity assessment (word count + action count), intent extraction |
| 3 | Gap Scorer | 1 | 6 element detectors (role, context, task, constraints, outputFormat, examples), each with strong + weak regex patterns, severity classification, weighted raw score calculation |

---

## Component 1: Tokenizer

### What It Does

Takes raw text → splits into words → classifies each word → extracts ranked keywords.

### Processing Pipeline

```
"Write me a good function that sorts an array please"
    │
    ▼ lowercase + strip punctuation
"write me a good function that sorts an array please"
    │
    ▼ split on whitespace, filter length > 1
["write", "me", "good", "function", "that", "sorts", "an", "array", "please"]
    │
    ▼ classify each word
[
  { word: "write",    isKeyword: true,  weight: 3 },  ← action verb
  { word: "me",       isKeyword: false, weight: 0 },  ← stop word
  { word: "good",     isKeyword: true,  weight: 1 },  ← other
  { word: "function", isKeyword: true,  weight: 2 },  ← domain keyword
  { word: "that",     isKeyword: false, weight: 0 },  ← stop word
  { word: "sorts",    isKeyword: true,  weight: 1 },  ← other (not in verb set as "sorts")
  { word: "an",       isKeyword: false, weight: 0 },  ← stop word
  { word: "array",    isKeyword: true,  weight: 2 },  ← domain keyword
  { word: "please",   isKeyword: false, weight: 0 },  ← stop word
]
    │
    ▼ extractKeywords (filter isKeyword, sort by weight desc, dedupe)
["write", "function", "array", "good", "sorts"]
```

### Word Classification

Three tiers by weight:

| Weight | Category | Count | Examples |
|--------|----------|-------|---------|
| **3** | Action verbs | ~40 | create, write, build, implement, fix, debug, refactor, optimize, analyze, explain, summarize, translate, deploy, scaffold, compose |
| **2** | Domain keywords | ~60 | api, database, function, component, server, frontend, backend, algorithm, typescript, react, mongodb, redis, docker, seo, campaign, dashboard |
| **1** | Other (not stop, not known) | ∞ | Any word not in stop/action/domain sets |
| **0** | Stop words | ~120 | a, the, is, are, to, of, in, for, me, you, please, thanks, just, very, really, about, how, what |

### Why These Word Sets Matter

- **Action verbs** (weight 3): Signal what the user wants to DO. "Create a function" vs "Analyze data" — the verb determines intent.
- **Domain keywords** (weight 2): Signal the TOPIC. "typescript" + "api" → coding. "seo" + "campaign" → marketing.
- **Stop words** (weight 0): Noise. "Write **me** a **good** function **that** sorts **an** array **please**" — the bolded words add zero meaning.

### Exports

| Method | Signature | Purpose |
|--------|-----------|---------|
| `tokenize(text)` | `(string) → Token[]` | Full tokenization with weights |
| `extractKeywords(tokens)` | `(Token[]) → string[]` | Filtered, sorted, deduped keywords |

---

## Component 2: Classifier

### What It Does

Takes `Token[]` + `keywords[]` → determines category, complexity, and intent.

### Category Classification

Each of the 5 categories has a keyword map with scores:

```
coding:    { code: 3, function: 3, api: 3, bug: 3, typescript: 2, react: 2, ... }
writing:   { write: 3, article: 3, blog: 3, story: 3, content: 2, draft: 2, ... }
analysis:  { analyze: 3, data: 3, report: 3, compare: 3, metrics: 2, trend: 2, ... }
marketing: { marketing: 3, seo: 3, campaign: 3, brand: 3, audience: 2, funnel: 2, ... }
general:   {} (empty — fallback)
```

**Algorithm:**
1. For each category, sum up keyword scores from user's tokens
2. Highest scoring category wins
3. If highest score < 3 → `"general"` (not enough signal)

**Example:**
```
Input: "write me a function that sorts an array"

coding:    function(3) + array(1) = 4    ← winner
writing:   write(3) = 3
analysis:  0
marketing: 0
general:   0

Result: "coding" (4 ≥ 3 threshold)
```

**Why threshold of 3:** Avoids false positives. A single weak match (e.g., "write" appearing in a coding prompt) shouldn't flip the category. Need at least one strong match (3) or multiple weaker ones.

### Complexity Assessment

Based on three signals:

| Signal | Simple | Medium | Complex |
|--------|--------|--------|---------|
| Word count | ≤ 30 | 31-80 | > 80 |
| Keyword count | ≤ 6 | 7-12 | > 12 |
| Action count | 0-1 | 2 | ≥ 3 |

**Rule:** If ANY signal hits the complex threshold → `complex`. Else if ANY hits medium → `medium`. Otherwise → `simple`.

**Why these thresholds:** Based on real prompt patterns:
- Simple: "write a sort function" (5 words, 1 action)
- Medium: "create a REST API endpoint that validates input and returns paginated results" (12 words, 2 actions)
- Complex: "design a microservice architecture with authentication, implement the user service, and write integration tests" (15 words, 3 actions)

**Complexity directly affects:**
- Token cost (1/3/5 tokens per request)
- Which rules fire in Phase 4 (some rules only run on medium/complex)
- Whether the agent searches for similar past prompts (similarity search is more valuable for complex prompts)

### Intent Extraction

Simple: join top 5 keywords into a sentence.

```
keywords: ["write", "function", "sort", "array"]
intent:   "User wants to: write, function, sort, array"
```

**Why this format:** The intent string is injected into the `add_context` rule in Phase 4. It doesn't need to be grammatically perfect — it needs to capture what the user is asking for so the rule engine can build a context section around it.

### Exports

| Method | Signature | Purpose |
|--------|-----------|---------|
| `classify(tokens)` | `(Token[]) → PromptCategory` | Category classification |
| `assessComplexity(text, keywords)` | `(string, string[]) → PromptComplexity` | Complexity assessment |
| `extractIntent(keywords)` | `(string[]) → string` | Intent string |

---

## Component 3: Gap Scorer

### What It Does

Takes raw text → checks 6 prompt elements via regex → returns what's missing/weak/ok + a score.

### The 6 Elements

| Element | What it means | Why it matters |
|---------|---------------|----------------|
| **role** | Who the AI should be ("You are a senior engineer") | Sets expertise level + perspective |
| **context** | Background info ("I'm building a REST API with Express") | Prevents assumptions |
| **task** | What to do ("Create a function that validates email") | Core instruction |
| **constraints** | Boundaries ("Do not use any type, must handle errors") | Prevents bad output |
| **outputFormat** | Expected output shape ("Respond in JSON", "Use markdown") | Gets structured results |
| **examples** | Input/output examples ("Example: input 'abc' → output 'ABC'") | Most powerful prompt technique |

### Detection Strategy

Each element has **strong patterns** (→ `ok`) and **weak patterns** (→ `weak`). No match → `missing`.

**Role detection:**

| Pattern type | Regex | Example match |
|-------------|-------|---------------|
| Strong | `/you are (a\|an)/i` | "You are a senior developer" |
| Strong | `/act as (a\|an)/i` | "Act as an expert" |
| Strong | `/your role is/i` | "Your role is to review code" |
| Strong | `/as (a\|an) (senior\|expert\|professional)/i` | "As a senior engineer" |
| Weak | `/like (a\|an)/i` | "Answer like a teacher" |
| Weak | `/pretend/i` | "Pretend you're an expert" |

**Context detection:**

| Pattern type | Regex | Example match |
|-------------|-------|---------------|
| Strong | `/context:/i` | "Context: we're migrating to AWS" |
| Strong | `/background:/i` | "Background: existing REST API" |
| Strong | `/given that/i` | "Given that we use TypeScript" |
| Strong | `/i('m\| am) (working on\|building\|creating)/i` | "I'm building a SaaS app" |
| Strong | `/my (project\|app\|system)/i` | "My project uses MongoDB" |
| Weak | `/about/i` | "This is about user auth" |
| Weak | `/regarding/i` | "Regarding the API" |

**Task detection:**

| Pattern type | Regex | Example match |
|-------------|-------|---------------|
| Strong | `/your task is/i` | "Your task is to implement..." |
| Strong | `/please (create\|write\|build\|generate)/i` | "Please create a function" |
| Strong | `/i need you to/i` | "I need you to refactor this" |
| Strong | `/i want you to/i` | "I want you to analyze the data" |
| Weak | `/(create\|write\|build\|make\|do)/i` | "write a sort function" |

**Constraints detection:**

| Pattern type | Regex | Example match |
|-------------|-------|---------------|
| Strong | `/do not\|don't\|must not\|never/i` | "Do not use any type" |
| Strong | `/constraints?:/i` | "Constraints: max 100 lines" |
| Strong | `/rules?:/i` | "Rules: no external deps" |
| Strong | `/must (be\|have\|include\|follow)/i` | "Must include error handling" |
| Strong | `/limit(ed)? to/i` | "Limited to 500 words" |
| Weak | `/avoid/i` | "Avoid complexity" |
| Weak | `/keep it/i` | "Keep it simple" |

**Output format detection:**

| Pattern type | Regex | Example match |
|-------------|-------|---------------|
| Strong | `/output format:/i` | "Output format: JSON" |
| Strong | `/respond (in\|with\|using) (json\|markdown)/i` | "Respond in JSON" |
| Strong | `/format (as\|like\|in)/i` | "Format as a table" |
| Strong | `/return (a\|the) (json\|list\|table)/i` | "Return a JSON object" |
| Weak | `/json/i` | "...using json..." |
| Weak | `/markdown/i` | "...in markdown..." |
| Weak | `/bullet points?/i` | "Use bullet points" |

**Examples detection:**

| Pattern type | Regex | Example match |
|-------------|-------|---------------|
| Strong | `/example:/i` | "Example: input → output" |
| Strong | `/for example/i` | "For example, if the input is..." |
| Strong | `/e\.g\./i` | "e.g. sort([3,1,2]) → [1,2,3]" |
| Strong | `/input:.+output:/is` | "Input: abc\nOutput: ABC" |
| Weak | `/like this/i` | "Something like this" |
| Weak | `/something like/i` | "Something like a table" |

### Raw Score Calculation

Each element has a weight reflecting its importance:

| Element | Weight | Why |
|---------|--------|-----|
| task | 2.5 | Most critical — if missing, the prompt is useless |
| context | 2.0 | Second most important — prevents hallucination |
| role | 1.5 | Sets expertise level |
| constraints | 1.5 | Prevents bad output |
| outputFormat | 1.5 | Gets structured results |
| examples | 1.0 | Powerful but optional for simple prompts |
| **Total** | **10.0** | |

**Formula:**
```
score = 0
for each gap:
  if ok     → score += weight
  if weak   → score += weight × 0.5
  if missing → score += 0

rawScore = round((score / 10) × 10)  → 1-10 scale
```

**Example:** All missing except task (weak):
```
task(weak) = 2.5 × 0.5 = 1.25
rawScore = round((1.25 / 10) × 10) = 1
```

**Example:** Role ok, context ok, task ok, rest missing:
```
role(ok)=1.5 + context(ok)=2.0 + task(ok)=2.5 = 6.0
rawScore = round((6.0 / 10) × 10) = 6
```

### Exports

| Method | Signature | Purpose |
|--------|-----------|---------|
| `detect(text)` | `(string) → PromptGap[]` | Check all 6 elements |
| `calcRawScore(gaps)` | `(PromptGap[]) → number` | Weighted 1-10 score |

---

## How the 3 Components Connect

```typescript
// This is how the AgentEngine (Phase 6) will call them:

private analyze(text: string): AnalysisResult {
  const tokens     = this.tokenizer.tokenize(text);
  const keywords   = this.tokenizer.extractKeywords(tokens);
  const category   = this.classifier.classify(tokens);
  const complexity = this.classifier.assessComplexity(text, keywords);
  const intent     = this.classifier.extractIntent(keywords);
  const gaps       = this.gapScorer.detect(text);
  const rawScore   = this.gapScorer.calcRawScore(gaps);

  return { tokens, keywords, category, complexity, intent, gaps, rawScore };
}
```

No cross-dependencies between the 3 components. Each takes simple inputs, returns simple outputs. The agent engine wires them together.

---

## Test Cases to Validate

### Tokenizer

| Input | Expected keywords (top 3) | Why |
|-------|--------------------------|-----|
| `"write me a function that sorts"` | `["write", "function", "sorts"]` | Action verb first, domain keyword second |
| `"please help me with something"` | `["help"]` | Almost all stop words, "help" is only meaningful word |
| `"implement a React component with TypeScript for user authentication"` | `["implement", "react", "component"]` | Action verb highest, then domain keywords |
| `""` | `[]` | Empty input → empty output |

### Classifier

| Input keywords | Expected category | Expected complexity | Why |
|---------------|-------------------|--------------------|----|
| `["write", "function", "sort", "array"]` | `coding` | `simple` | function+array → coding. 4 keywords, 1 action → simple |
| `["write", "blog", "post", "seo", "marketing"]` | `marketing` | `medium` | seo+marketing outscores writing. 5 keywords → medium |
| `["analyze", "data", "compare", "create", "dashboard", "deploy"]` | `analysis` | `complex` | analyze+data+compare. 3 actions → complex |
| `["hello"]` | `general` | `simple` | No category scores ≥ 3 → general |

### Gap Scorer

| Input | Expected gaps | Expected score |
|-------|---------------|----------------|
| `"write a function"` | role:missing, context:missing, task:weak, constraints:missing, format:missing, examples:missing | 1 |
| `"You are a senior dev. Please create a REST API. Do not use any."` | role:ok, context:missing, task:ok, constraints:ok, format:missing, examples:missing | 6 |
| `"You are an expert. Context: building a SaaS. Your task is to design the auth module. Do not use deprecated APIs. Respond in JSON. Example: input → output"` | All ok | 10 |

---

## Design Decisions

### Why regex instead of NLP/ML for gap detection?

| | Regex (chosen) | NLP (alternative) |
|---|---|---|
| Speed | <1ms | 50-200ms (tokenization + model) |
| Dependencies | None | spaCy/compromise/natural (heavy) |
| Accuracy | Good for structured patterns | Better for fuzzy matching |
| Maintainability | Add new regex = 1 line | Retrain/update model |
| Predictability | Deterministic — same input = same output | Probabilistic |

**Decision:** Regex. Prompt elements follow predictable patterns ("you are", "do not", "example:"). NLP is overkill. If accuracy becomes a problem at scale → upgrade to NLP in a future phase.

### Why 3 separate classes instead of 1 monolithic analyzer?

- **Testable independently:** Unit test tokenizer without classifier
- **Replaceable:** Swap classifier algorithm without touching tokenizer
- **Single responsibility:** Each does one thing well
- **Reusable:** Tokenizer could be used by other features (template matching, search)

### Why static word sets instead of loading from DB?

- No async startup required
- No DB dependency → pure logic
- Sets rarely change — adding words is a code change (which is fine, it's a deploy anyway)
- **Future:** If sets need to be dynamic → move to Redis hash sets. But not needed for v1.

---

## What Phase 3 Outputs

The `AnalysisResult` is consumed by:

| Consumer | What it uses | Why |
|----------|-------------|-----|
| **Phase 4 — Rule Engine** | `gaps` (which rules to fire), `category` (which templates), `keywords` (task focus areas), `complexity` (quality markers) |
| **Phase 5 — Learner** | `category` (filter similar prompts), `keywords` (stored for text index) |
| **Phase 6 — Agent Engine** | Full `AnalysisResult` — runs analyze twice (before transform + after, to score output) |
| **Phase 9 — Token System** | `complexity` → maps to token cost (simple=1, medium=3, complex=5) |
| **API Response** | `category`, `complexity`, `gaps` — returned to user for transparency |

---

## Verification Checklist

After Phase 3 is coded:

- [x] Tokenizer handles empty string → returns `[]`
- [x] Tokenizer handles single word → correct Token
- [x] Stop words produce `weight: 0` and `isKeyword: false`
- [x] Action verbs produce `weight: 3`
- [x] Domain keywords produce `weight: 2`
- [x] Keywords are deduped (no repeated words)
- [x] Keywords are sorted by weight descending
- [x] Classifier returns `general` when no category scores ≥ 3
- [x] Classifier correctly identifies all 5 categories
- [x] Complexity is `simple` for ≤ 30 words with 1 action
- [x] Complexity is `complex` for > 80 words or 3+ actions
- [x] Gap scorer detects all 6 elements independently
- [x] Strong pattern → `ok`, weak pattern → `weak`, no match → `missing`
- [x] Raw score is 10 when all elements are `ok`
- [x] Raw score is 0 when all elements are `missing`
- [x] All 3 classes are stateless — no instance state between calls
- [x] No database imports, no network calls, no side effects

---

## Next: Phase 4

Phase 4 builds the Rule Engine + Model Adapter — the transformation layer that takes the `AnalysisResult` and rewrites the prompt with proper structure, constraints, and model-specific formatting.
