import type { CoffeeSummary, Verdict } from './cost-model'
import { summarize, verdictFor } from './cost-model'
import { formatDuration, formatMoney } from './format'
import { toCoffeeInputs } from './inputs'
import type { CalculatorValues } from './schema'
import { agentFillSchema, calculatorSchema } from './schema'

export interface AgentFillError {
  /** Field name, or "input" when the problem isn't tied to one field. */
  field: string
  message: string
}

export type AgentFill =
  | {
      ok: true
      /** Only the fields the agent sent, to set on the form one by one. */
      changes: Partial<CalculatorValues>
      values: CalculatorValues
    }
  | { ok: false; errors: AgentFillError[] }

/** What the `fill_calculator` tool hands back to the agent. */
export type AgentFillResult =
  | {
      ok: true
      values: CalculatorValues
      summary: CoffeeSummary
      verdict: Verdict
      /** One sentence the agent can quote, in the chosen currency. */
      message: string
    }
  | { ok: false; errors: AgentFillError[] }

function toErrors(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.map(String).join('.') : 'input',
    message: issue.message,
  }))
}

/**
 * Merges an agent's partial input onto the current form values. Nothing is
 * applied unless both the input and the merged result are valid.
 */
export function applyAgentFill(
  current: CalculatorValues,
  input: unknown,
): AgentFill {
  const partial = agentFillSchema.safeParse(input ?? {})
  if (!partial.success) {
    return { ok: false, errors: toErrors(partial.error.issues) }
  }
  const merged = calculatorSchema.safeParse({ ...current, ...partial.data })
  if (!merged.success) {
    return { ok: false, errors: toErrors(merged.error.issues) }
  }
  return { ok: true, changes: partial.data, values: merged.data }
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

/** The calculator's result for a set of values, shaped for an agent. */
export function agentFillResult(values: CalculatorValues): AgentFillResult {
  const summary = summarize(toCoffeeInputs(values))
  const verdict = verdictFor(summary, values.years)
  return {
    ok: true,
    values,
    summary,
    verdict,
    message: verdictMessage(summary, verdict, values),
  }
}
