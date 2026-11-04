import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite-plus'

import { agentApi } from './vite/agent-api'

const config = defineConfig(({ mode }) => ({
  resolve: { tsconfigPaths: true },
  // Unit tests render components in jsdom; the app shell plugins
  // (devtools, tailwindcss, tanstackStart) stay out of test mode.
  plugins:
    mode === 'test'
      ? [viteReact()]
      : [
          devtools(),
          tailwindcss(),
          // Emit the SPA shell as index.html so static hosts serve it at `/`
          // and deep links can rewrite to it (the default is _shell.html).
          tanstackStart({
            spa: { enabled: true, prerender: { outputPath: '/index' } },
          }),
          viteReact(),
          // /api/chat in dev and preview, served by @espressionism/agent
          agentApi(),
        ],
  run: {
    tasks: {
      build: {
        command: 'vp build',
        // `vp preview` serves the built agent at /api, so build it first.
        dependsOn: [{ task: 'build', from: 'dependencies' }],
      },
      'test:unit': {
        command: 'vp test run',
      },
    },
  },
  test: {
    environment: 'jsdom',
    // One jsdom per worker; each file still runs in its own VM context.
    pool: 'vmThreads',
    globals: true,
    include: ['test/**/*.test.{ts,tsx}'],
    setupFiles: ['./test/setup.ts'],
    env: { TZ: 'UTC' },
  },
}))

export default config
