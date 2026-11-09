import { DRINKS, fillToolInputSchema } from '@espressionism/calculator'
import { z } from 'zod'

import { CURRENCIES } from '../utils/format'

// The calculator's core lives in `@espressionism/calculator`, shared with
// Robospresso; the form and the URL read it from here.
export type { CalculatorValues } from '@espressionism/calculator'
export {
  DEFAULT_INPUTS,
  DRINK_LABELS,
  agentFillSchema,
  calculatorSchema,
} from '@espressionism/calculator'

/** URL search params: every field optional, invalid values fall back. */
export const calculatorSearchSchema = z.object({
  drink: z.enum(DRINKS).optional().catch(undefined),
  currency: z.enum(CURRENCIES).optional().catch(undefined),
  cafePrice: z.number().positive().max(50).optional().catch(undefined),
  cupsPerDay: z.number().int().min(1).max(10).optional().catch(undefined),
  daysPerWeek: z.number().int().min(1).max(7).optional().catch(undefined),
  machinePrice: z.number().min(0).max(20000).optional().catch(undefined),
  homeCostPerCup: z.number().min(0).max(20).optional().catch(undefined),
  yearlyMaintenance: z.number().min(0).max(5000).optional().catch(undefined),
  years: z.number().int().min(1).max(10).optional().catch(undefined),
})

export type CalculatorSearch = z.infer<typeof calculatorSearchSchema>

/** JSON Schema for the WebMCP `fill_calculator` tool, derived from Zod. */
export const AGENT_FILL_INPUT_SCHEMA = z.toJSONSchema(fillToolInputSchema)
