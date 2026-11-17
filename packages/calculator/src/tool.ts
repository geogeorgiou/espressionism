/**
 * `fill_calculator`, defined once with `defineTool`. Robospresso's model
 * reaches it through the AI SDK (`packages/agent`), a visitor's in-browser
 * agent through WebMCP (the client's calculator page). Both run
 * `fillTool.run(input, { current })` on the values the page shows, so they
 * validate and answer the same way.
 */
import { defineTool, toolFailure } from '@espressionism/tool'
import type { ToolOutput } from '@espressionism/tool'
import { z } from 'zod'

import { analyze } from './analyze'
import type { CoffeeSummary, Verdict } from './cost-model'
import type { CalculatorValues } from './schema'
import { calculatorSchema } from './schema'

/** What agents may send: any subset of the calculator's fields. */
const fillInputSchema = calculatorSchema.partial().strict()

export type FillToolInput = z.infer<typeof fillInputSchema>

const VERDICTS = [
  'cafe-wins',
  'fast',
  'solid',
  'slow',
] as const satisfies Verdict[]

const coffeeSummarySchema = z.object({
  cupsPerYear: z.number(),
  cafeYearly: z.number(),
  homeCostYearly: z.number(),
  yearlySavings: z.number(),
  breakEvenMonths: z.number().nullable(),
  cafeTotal: z.number(),
  homeTotal: z.number(),
  netSavings: z.number(),
  effectiveHomeCupCost: z.number(),
}) satisfies z.ZodType<CoffeeSummary>

/** A fill: what changed, the merged values and their analysis. */
const fillResultSchema = z.object({
  /** Only the fields the agent sent, to set on the form one by one. */
  changes: fillInputSchema,
  values: calculatorSchema,
  summary: coffeeSummarySchema,
  verdict: z.enum(VERDICTS),
  /** One sentence the agent can quote, in the chosen currency. */
  message: z.string(),
})

/**
 * Merges the agent's fields onto `ctx.current` (the values the page shows)
 * and analyzes the result. Nothing is applied unless the merged values are
 * valid too: a field the agent left alone but the visitor half-typed fails
 * the fill with the form's message.
 */
export const fillTool = defineTool({
  name: 'fill_calculator',
  title: 'Fill the calculator',
  description:
    "Fill in the espresso machine break-even calculator with the visitor's coffee habit and machine costs, then return the result: break-even, totals and a verdict. Send only the fields you know; the rest keep their current values.",
  input: fillInputSchema,
  output: fillResultSchema,
  run: (changes, { current }: { current: CalculatorValues }) => {
    const merged = calculatorSchema.safeParse({ ...current, ...changes })
    if (!merged.success) return toolFailure(merged.error.issues)
    return { changes, values: merged.data, ...analyze(merged.data) }
  },
})

export type FillToolOutput = ToolOutput<typeof fillTool>
