import type { CoffeeInputs } from './cost-model'
import type { CalculatorValues } from './schema'

/** The cost model's inputs: the form values minus display-only fields. */
export function toCoffeeInputs(values: CalculatorValues): CoffeeInputs {
  const { drink: _drink, currency: _currency, ...inputs } = values
  return inputs
}
