import { describe, expect, it } from 'vite-plus/test'

import { analyze } from '../../src/analyze'
import { fill } from '../../src/fill'
import { DEFAULT_INPUTS } from '../../src/schema'
import { fillToolOutputSchema } from '../../src/tool'

describe('fill', () => {
  it('merges the sent fields onto the current values and analyzes them', () => {
    const output = fill(DEFAULT_INPUTS, { cupsPerDay: 2, machinePrice: 450 })
    const values = { ...DEFAULT_INPUTS, cupsPerDay: 2, machinePrice: 450 }
    expect(output).toEqual({
      ok: true,
      changes: { cupsPerDay: 2, machinePrice: 450 },
      values,
      ...analyze(values),
    })
    // 2 lattes × 5 days at €3.50 against €0.45 at home: a €450 machine
    // pays for itself well inside a year.
    expect(output.ok && output.verdict).toBe('fast')
  })

  it('matches the tool output schema', () => {
    const output = fill(DEFAULT_INPUTS, { drink: 'mocha' })
    expect(fillToolOutputSchema.parse(output)).toEqual(output)
    const failure = fill(DEFAULT_INPUTS, { years: 0 })
    expect(fillToolOutputSchema.parse(failure)).toEqual(failure)
  })

  it('treats a missing input as an empty fill', () => {
    expect(fill(DEFAULT_INPUTS, undefined)).toMatchObject({
      ok: true,
      changes: {},
      values: DEFAULT_INPUTS,
    })
  })

  it('reports out-of-range values with the form messages', () => {
    expect(fill(DEFAULT_INPUTS, { daysPerWeek: 9 })).toEqual({
      ok: false,
      errors: [{ field: 'daysPerWeek', message: 'A week has seven days' }],
    })
  })

  it('rejects unknown fields and wrong types', () => {
    const output = fill(DEFAULT_INPUTS, { cafePrice: '4', sugar: 2 })
    expect(output.ok).toBe(false)
    if (output.ok) return
    expect(new Set(output.errors.map((e) => e.field))).toEqual(
      new Set(['cafePrice', 'input']),
    )
  })

  it('rejects a free café drink', () => {
    expect(fill(DEFAULT_INPUTS, { cafePrice: 0 })).toEqual({
      ok: false,
      errors: [
        { field: 'cafePrice', message: 'Café price must be above zero' },
      ],
    })
  })

  it('flags a field the agent left alone if the form has it half-typed', () => {
    expect(
      fill({ ...DEFAULT_INPUTS, machinePrice: Number.NaN }, { years: 3 }),
    ).toEqual({
      ok: false,
      errors: [{ field: 'machinePrice', message: 'Machine price is required' }],
    })
  })
})
