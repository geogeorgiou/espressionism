import { defineConfig } from 'vite-plus'

// Source-only package: the client and the agent import the TypeScript (and
// catalog.json) directly, so there is no build task.
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
    env: { TZ: 'UTC' },
  },
})
