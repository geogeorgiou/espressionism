import type { CoffeeSummary, Verdict } from './cost-model'
import { summarize, verdictFor } from './cost-model'
import { formatDuration, formatMoney } from './format'
import type { CalculatorValues } from './schema'

/** The calculator's read on a set of values. */
export interface Analysis {
  summary: CoffeeSummary
  verdict: Verdict
  /** One sentence an agent can quote, in the chosen currency. */
  message: string
}

function verdictMessage(
  summary: CoffeeSummary,
  verdict: Verdict,
  values: CalculatorValues,
): string {
  const span = `${values.years} ${values.years === 1 ? 'year' : 'years'}`
  const net = formatMoney(Math.abs(summary.netSavings), values.currency)
  if (verdict === 'never' || summary.breakEvenMonths === null) {
    return `The café wins over ${span}: buying out costs ${net} less than the machine.`
  }
  const when = formatDuration(summary.breakEvenMonths)
  return `The machine pays for itself in ${when} and leaves ${net} in your pocket over ${span}.`
}

/**
 * Break-even, totals, a verdict and a quotable sentence for valid values.
 * The page, Robospresso and WebMCP all read results through here.
 */
export function analyze(values: CalculatorValues): Analysis {
  const summary = summarize(values)
  const verdict = verdictFor(summary, values.years)
  return { summary, verdict, message: verdictMessage(summary, verdict, values) }
}
