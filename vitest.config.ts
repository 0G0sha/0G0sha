import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    env: { NODE_ENV: 'test' },
    include: ['src/**/__tests__/**/*.endpoint.test.ts'],
    reporters: ['verbose'],
    testTimeout: 10000,
  },
})
