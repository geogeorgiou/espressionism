import { defineConfig } from 'vite-plus'

// Source-only package: store, calculator, the agent and the client import
// the TypeScript directly, so there is no build task.
export default defineConfig({
  run: {
    tasks: {
      'test:unit': {
        command: 'vp test run',
      },
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
})
