---
name: vitest-backend
description: >
  Scaffold and configure Vitest for Node.js + TypeScript + Express backends with full coverage:
  unit tests (services, utils), integration tests (HTTP via supertest), and DB-layer tests
  (Prisma + PostgreSQL and/or Mongoose + MongoDB). Generates vitest.config.ts, mock strategies
  (vi.mock() inline and __mocks__ dir), and test file structures (co-located or __tests__ dir).
  Use this skill whenever the user asks about testing a backend, writing tests, setting up Vitest,
  mocking Prisma, mocking Mongoose, supertest integration, test configuration, or anything
  related to backend test coverage — even vague requests like "how do I test my service" or
  "add tests to my module".
---

# Vitest Backend Skill

## Stack assumptions

- Node.js + TypeScript + Express
- Prisma (PostgreSQL) and/or Mongoose (MongoDB)
- ES modules or CommonJS (detect from user's `package.json`)
- `supertest` for HTTP integration tests

---

## 1. Dependencies

```bash
pnpm add -D vitest @vitest/coverage-v8 supertest @types/supertest
# If using Mongoose in-memory:
pnpm add -D mongodb-memory-server
# If using Prisma:
pnpm add -D @prisma/client  # already present usually
# vitest-mock-extended is optional but helpful for Prisma
pnpm add -D vitest-mock-extended
```

---

## 2. vitest.config.ts

### ESM project

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['node_modules', 'dist', '**/*.test.ts', '**/*.spec.ts'],
    },
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.ts', 'src/__tests__/**/*.{test,spec}.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

### CJS project (add to `test` block)

```ts
pool: 'forks',
poolOptions: { forks: { singleFork: true } },
```

---

## 3. Global setup file (`src/test/setup.ts`)

```ts
import { afterAll, beforeAll } from 'vitest';

// Add global hooks here, e.g. DB connect/disconnect for integration tests
// Or leave empty — vitest just needs the file to exist for globals: true
```

---

## 4. File structure conventions

### Co-located

```
src/modules/user/
├── user.service.ts
├── user.service.test.ts       ← unit
├── user.repository.ts
├── user.repository.test.ts    ← DB layer
└── user.controller.test.ts    ← HTTP integration
```

### Separate `__tests__` dir

```
src/
├── modules/user/
│   ├── user.service.ts
│   └── user.repository.ts
└── __tests__/
    ├── unit/user.service.test.ts
    ├── integration/user.routes.test.ts
    └── db/user.repository.test.ts
```

Both patterns are valid — co-located scales better per-module, `__tests__` is easier to exclude from builds.

---

## 5. Mocking strategies

See `references/mocking.md` for full patterns on:
- Prisma (`vi.mock` inline + `vitest-mock-extended`)
- Mongoose (`vi.mock` inline + `mongodb-memory-server`)
- `__mocks__` directory approach for both
- Express app factory pattern for supertest

---

## 6. Test anatomy by layer

### Unit — service

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';

vi.mock('./user.repository');

const mockRepo = vi.mocked(UserRepository);

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UserService(new mockRepo());
  });

  it('returns user by id', async () => {
    mockRepo.prototype.findById.mockResolvedValue({ id: '1', name: 'Mo' });
    const result = await service.getUser('1');
    expect(result).toMatchObject({ id: '1' });
  });
});
```

### Integration — HTTP (supertest)

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '@/app';   // app factory, not app.listen()

const app = createApp();

describe('GET /users/:id', () => {
  it('returns 200 with user', async () => {
    const res = await request(app).get('/users/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
  });
});
```

> Always use an **app factory** (`createApp()`) — never import a live `app.listen()` instance.

### DB layer — repository

For Prisma and Mongoose patterns, see `references/mocking.md`.

---

## 7. package.json scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:unit": "vitest run src/**/*.unit.test.ts",
    "test:integration": "vitest run src/**/*.integration.test.ts"
  }
}
```

---

## 8. Key rules

- Never import `app.listen()` directly in tests — always use app factory
- Always `vi.clearAllMocks()` in `beforeEach`
- Prisma: mock at module level, not per-test
- Mongoose: prefer `mongodb-memory-server` over `vi.mock` for repository tests
- Keep test DB isolated — never point tests at production DB
- Use `expect.assertions(n)` for async error path tests
