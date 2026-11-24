// Shared by each package's stryker.config.mjs. See docs/adr/0001.
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export const base = {
  // pnpm doesn't hoist the runner, so name it.
  plugins: ['@stryker-mutator/vitest-runner'],
  testRunner: 'vitest',
  // scripts/mutation.ts sets this with --mutate.
  mutate: [],
  thresholds: { high: 85, low: 70, break: 60 },
  incremental: true,
  reporters: ['clear-text', 'progress', 'json', 'html'],
}

export default base
