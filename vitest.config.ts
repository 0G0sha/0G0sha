import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: { NODE_ENV: 'test' },
    include: ['src/**/__tests__/**/*.endpoint.test.ts'],
    reporters: ['verbose'],
    testTimeout: 10000,
  },
})
