import { analyze } from './analyze'
import { calculatorSchema } from './schema'
import type { CalculatorValues } from './schema'
import type { FillToolOutput } from './tool'
import { fillToolInputSchema } from './tool'

function toErrors(issues: { path: PropertyKey[]; message: string }[]) {
  return issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.map(String).join('.') : 'input',
    message: issue.message,
  }))
}

/**
 * A fill: merges an agent's partial, untrusted input onto the current values
 * and returns what changed, the merged values and their analysis. Nothing is
 * applied unless both the input and the merged values are valid; then it
 * returns `{ ok: false, errors }` with the form's messages. Never throws.
 */
export function fill(
  current: CalculatorValues,
  input: unknown,
): FillToolOutput {
  const partial = fillToolInputSchema.safeParse(input ?? {})
  if (!partial.success) {
    return { ok: false, errors: toErrors(partial.error.issues) }
  }
  const merged = calculatorSchema.safeParse({ ...current, ...partial.data })
  if (!merged.success) {
    return { ok: false, errors: toErrors(merged.error.issues) }
  }
  return {
    ok: true,
    changes: partial.data,
    values: merged.data,
    ...analyze(merged.data),
  }
}
