import { z } from 'zod'

import { DRINKS, DRINK_LABELS } from './drinks'
import { CURRENCIES } from './format'

/** Starting values: a weekday flat-white habit and a mid-range machine. */
export const DEFAULT_INPUTS: CalculatorValues = {
  drink: 'latte',
  currency: 'EUR',
  cafePrice: 3.5,
  cupsPerDay: 1,
  daysPerWeek: 5,
  machinePrice: 600,
  homeCostPerCup: 0.45,
  yearlyMaintenance: 40,
  years: 5,
}

const money = (label: string, max: number) =>
  z
    .number({ error: `${label} is required` })
    .min(0, `${label} can't be negative`)
    .max(max, `${label} looks too high`)

const count = (label: string, unit: string) =>
  z.number({ error: `${label} is required` }).int(`Use whole ${unit}`)

// Descriptions sit last in each chain (`.meta` attaches to that instance) and
// end up in the WebMCP tool's JSON Schema, so they're written for an agent.
export const calculatorSchema = z.object({
  drink: z.enum(DRINKS).meta({
    description: `The drink usually bought at the café: ${Object.entries(
      DRINK_LABELS,
    )
      .map(([flavor, label]) => `${flavor} (${label})`)
      .join(', ')}.`,
  }),
  currency: z
    .enum(CURRENCIES)
    .meta({ description: 'Currency for every amount.' }),
  cafePrice: money('Café price', 50)
    .gt(0, 'Café price must be above zero')
    .meta({ description: 'Price of one café drink.' }),
  cupsPerDay: count('Cups per day', 'cups')
    .min(1, 'At least one cup')
    .max(10, 'Ten cups is plenty')
    .meta({ description: 'Café drinks bought per day.' }),
  daysPerWeek: count('Days per week', 'days')
    .min(1, 'At least one day')
    .max(7, 'A week has seven days')
    .meta({ description: 'Days per week the user buys coffee out.' }),
  machinePrice: money('Machine price', 20000).meta({
    description: 'One-off price of the espresso machine, grinder included.',
  }),
  homeCostPerCup: money('Home cost per cup', 20).meta({
    description: 'Beans, milk and power for one cup made at home.',
  }),
  yearlyMaintenance: money('Maintenance', 5000).meta({
    description: 'Yearly descaling, filters and servicing.',
  }),
  years: count('Years', 'years')
    .min(1, 'At least one year')
    .max(10, 'Up to ten years')
    .meta({ description: 'How many years to compare over.' }),
})

export type CalculatorValues = z.infer<typeof calculatorSchema>

/** What an agent may send to fill the calculator: any subset of the fields. */
export const agentFillSchema = calculatorSchema.partial().strict()
