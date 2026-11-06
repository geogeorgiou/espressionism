import { defineConfig } from 'vite-plus'

export default defineConfig({
  // Bundled for the runtime (the Vercel Function and `vp preview`); the
  // client and the tests read the TypeScript source directly.
  pack: {
    entry: ['src/index.ts'],
    format: 'esm',
    platform: 'node',
    dts: false,
  },
  run: {
    tasks: {
      build: {
        command: 'vp pack',
      },
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
