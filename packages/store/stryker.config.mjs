import { base } from '../../stryker.config.mjs'

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default { ...base, vitest: { configFile: 'vite.config.ts' } }
