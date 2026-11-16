export type { Drink } from './drinks'
export { DRINKS, DRINK_LABELS } from './drinks'
export type { Currency } from './format'
export { CURRENCIES, formatDuration, formatMoney } from './format'
export type { CalculatorValues } from './schema'
export { DEFAULT_INPUTS, calculatorSchema } from './schema'
export type { Analysis } from './analyze'
export { analyze } from './analyze'
export { fill } from './fill'
export type {
  CoffeeInputs,
  CoffeeSummary,
  CumulativePoint,
  CupCostPoint,
  Verdict,
  YearlyPoint,
} from './cost-model'
export { costPerCupOverTime, cumulativeCosts, yearlySpend } from './cost-model'
export type { FillToolInput, FillToolOutput } from './tool'
export {
  CALCULATOR_TOOL,
  fillToolInputSchema,
  fillToolOutputSchema,
} from './tool'
