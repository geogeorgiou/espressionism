import { z } from 'zod'

import catalogJson from './catalog.json'
import type { Machine } from './schema'
import { machineSchema } from './schema'

/**
 * The ten machines on sale. Generated once with faker (a throwaway script,
 * not a dependency) and committed: brands are real, prices and ratings are
 * made up. Parsed on load, so a bad edit fails fast.
 */
export const CATALOG: readonly Machine[] = z
  .array(machineSchema)
  .parse(catalogJson)
