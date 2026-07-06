import { defineConfig } from 'vitest/config'

const includeIntegration = process.env.INCLUDE_INTEGRATION === 'true'
const baseExcludes = ['e2e/**', 'tests/**', 'node_modules/**']
const exclude = includeIntegration ? baseExcludes : ['**/*.integration.*', ...baseExcludes]

export default defineConfig({
  test: {
    // Exclude Playwright and integration tests from Vitest runs by default
    exclude,
    setupFiles: ['./vitest.setup.ts'],
  },
})
