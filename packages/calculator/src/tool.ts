/**
 * The calculator tool, defined once. Robospresso's model reaches it through
 * the AI SDK (`packages/agent`), a visitor's in-browser agent through WebMCP
 * (the client's calculator page). Both adapters hand the raw input and the
 * current form values to `runCalculatorFill`, so they validate and answer
 * the same way.
 */
import { z } from 'zod'

import type { AgentFillError } from './agent-fill'
import { agentFillResult, applyAgentFill } from './agent-fill'
import type { CoffeeSummary, Verdict } from './cost-model'
import type { CalculatorValues } from './schema'
import { agentFillSchema, calculatorSchema } from './schema'

export const CALCULATOR_TOOL = {
  name: 'fill_calculator',
  title: 'Fill the calculator',
  description:
    "Fill in the espresso machine break-even calculator with the user's coffee habit and machine costs, then return the result: break-even, totals and a verdict. Send only the fields you know; the rest keep their current values.",
} as const

/** What agents may send: any subset of the calculator's fields. */
export const fillToolInputSchema = agentFillSchema

export type FillToolInput = z.infer<typeof fillToolInputSchema>

const VERDICTS = ['never', 'fast', 'solid', 'slow'] as const satisfies Verdict[]

const coffeeSummarySchema = z.object({
  cupsPerYear: z.number(),
  cafeYearly: z.number(),
  homeRunningYearly: z.number(),
  yearlySavings: z.number(),
  breakEvenMonths: z.number().nullable(),
  cafeTotal: z.number(),
  homeTotal: z.number(),
  netSavings: z.number(),
  effectiveHomeCupCost: z.number(),
}) satisfies z.ZodType<CoffeeSummary>

/** A tool answer: the merged values, what changed and the calculator's read. */
export const fillToolOutputSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    /** Only the fields the agent sent. */
    changes: fillToolInputSchema,
    values: calculatorSchema,
    summary: coffeeSummarySchema,
    verdict: z.enum(VERDICTS),
    /** One sentence the agent can quote, in the chosen currency. */
    message: z.string(),
  }),
  z.object({
    ok: z.literal(false),
    errors: z.array(z.object({ field: z.string(), message: z.string() })),
  }),
])

export type FillToolOutput = z.infer<typeof fillToolOutputSchema>

/**
 * Merges an agent's input onto the current values and returns the result,
 * or the errors. Never throws; invalid input changes nothing.
 */
export function runCalculatorFill(
  current: CalculatorValues,
  input: unknown,
): FillToolOutput {
  const fill = applyAgentFill(current, input)
  if (!fill.ok)
    return { ok: false, errors: fill.errors satisfies AgentFillError[] }
  const result = agentFillResult(fill.values)
  if (!result.ok) return result
  return { ...result, changes: fill.changes }
}
