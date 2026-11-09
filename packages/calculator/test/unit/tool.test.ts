import { describe, expect, it } from 'vite-plus/test'

import { DEFAULT_INPUTS } from '../../src/schema'
import { fillToolOutputSchema, runCalculatorFill } from '../../src/tool'

describe('runCalculatorFill', () => {
  it('merges the sent fields onto the current values and reads the result', () => {
    const output = runCalculatorFill(DEFAULT_INPUTS, {
      cupsPerDay: 2,
      machinePrice: 450,
    })
    expect(output.ok).toBe(true)
    if (!output.ok) return
    expect(output.changes).toEqual({ cupsPerDay: 2, machinePrice: 450 })
    expect(output.values).toEqual({
      ...DEFAULT_INPUTS,
      cupsPerDay: 2,
      machinePrice: 450,
    })
    // 2 lattes × 5 days at €3.50 against €0.45 at home: a €450 machine
    // pays for itself well inside a year.
    expect(output.verdict).toBe('fast')
    expect(output.message).toMatch(
      /^The machine pays for itself in \d+ months?/,
    )
    expect(fillToolOutputSchema.parse(output)).toEqual(output)
  })

  it('changes nothing and explains why for bad input', () => {
    expect(
      runCalculatorFill(DEFAULT_INPUTS, { cupsPerDay: 0, mood: 'sleepy' }),
    ).toEqual({
      ok: false,
      errors: expect.arrayContaining([
        expect.objectContaining({ field: expect.any(String) }),
      ]),
    })
  })
})
