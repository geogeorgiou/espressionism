import {
  calculatorSchema,
  fillToolInputSchema,
} from '@espressionism/calculator'
import { z } from 'zod'

// The calculator's core lives in `@espressionism/calculator`, shared with
// Robospresso; the form and the URL read it from here.
export type { CalculatorValues } from '@espressionism/calculator'
export {
  DEFAULT_INPUTS,
  DRINK_LABELS,
  agentFillSchema,
  calculatorSchema,
} from '@espressionism/calculator'

type CalculatorShape = typeof calculatorSchema.shape

/**
 * URL search params: the calculator's own rules, with every field optional
 * and an invalid value dropped (the form falls back to its default) instead
 * of failing the page. Derived, never restated, so the URL can't drift from
 * the form, Robospresso and WebMCP.
 */
export const calculatorSearchSchema = z.object(
  Object.fromEntries(
    Object.entries(calculatorSchema.shape).map(([key, field]) => [
      key,
      (field as z.ZodType).optional().catch(undefined),
    ]),
  ) as {
    [K in keyof CalculatorShape]: z.ZodCatch<z.ZodOptional<CalculatorShape[K]>>
  },
)

export type CalculatorSearch = z.infer<typeof calculatorSearchSchema>

/** JSON Schema for the WebMCP `fill_calculator` tool, derived from Zod. */
export const AGENT_FILL_INPUT_SCHEMA = z.toJSONSchema(fillToolInputSchema)
