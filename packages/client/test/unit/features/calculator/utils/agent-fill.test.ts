import { describe, expect, it } from 'vite-plus/test'

import { DEFAULT_INPUTS } from '@/features/calculator/constants'
import {
  agentFillResult,
  applyAgentFill,
} from '@/features/calculator/utils/agent-fill'

describe('applyAgentFill', () => {
  it('merges a partial fill onto the current values', () => {
    const fill = applyAgentFill(DEFAULT_INPUTS, {
      cupsPerDay: 2,
      drink: 'mocha',
    })
    expect(fill).toEqual({
      ok: true,
      changes: { cupsPerDay: 2, drink: 'mocha' },
      values: { ...DEFAULT_INPUTS, cupsPerDay: 2, drink: 'mocha' },
    })
  })

  it('treats a missing input as an empty fill', () => {
    const fill = applyAgentFill(DEFAULT_INPUTS, undefined)
    expect(fill).toEqual({ ok: true, changes: {}, values: DEFAULT_INPUTS })
  })

  it('reports out-of-range values with the form messages', () => {
    const fill = applyAgentFill(DEFAULT_INPUTS, { daysPerWeek: 9 })
    expect(fill).toEqual({
      ok: false,
      errors: [{ field: 'daysPerWeek', message: 'A week has seven days' }],
    })
  })

  it('rejects unknown fields and wrong types', () => {
    const fill = applyAgentFill(DEFAULT_INPUTS, { cafePrice: '4', sugar: 2 })
    expect(fill.ok).toBe(false)
    if (fill.ok) return
    expect(new Set(fill.errors.map((e) => e.field))).toEqual(
      new Set(['cafePrice', 'input']),
    )
  })

  it('rejects a free café drink', () => {
    const fill = applyAgentFill(DEFAULT_INPUTS, { cafePrice: 0 })
    expect(fill).toEqual({
      ok: false,
      errors: [
        { field: 'cafePrice', message: 'Café price must be above zero' },
      ],
    })
  })

  it('flags a field the agent left alone if the form has it half-typed', () => {
    const fill = applyAgentFill(
      { ...DEFAULT_INPUTS, machinePrice: Number.NaN },
      { years: 3 },
    )
    expect(fill).toEqual({
      ok: false,
      errors: [{ field: 'machinePrice', message: 'Machine price is required' }],
    })
  })
})

describe('agentFillResult', () => {
  it('returns the summary, verdict and a quotable message', () => {
    const result = agentFillResult({
      ...DEFAULT_INPUTS,
      cafePrice: 4,
      cupsPerDay: 1,
      daysPerWeek: 5,
      machinePrice: 520,
      homeCostPerCup: 1,
      yearlyMaintenance: 0,
      years: 2,
      currency: 'EUR',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.summary.breakEvenMonths).toBeCloseTo(8)
    expect(result.verdict).toBe('solid')
    expect(result.message).toBe(
      'The machine pays for itself in 8 months and leaves €1,040 in your pocket over 2 years.',
    )
  })

  it('says the café wins when the machine never pays off', () => {
    const result = agentFillResult({
      ...DEFAULT_INPUTS,
      cafePrice: 1,
      homeCostPerCup: 2,
      machinePrice: 500,
      yearlyMaintenance: 0,
      years: 1,
      currency: 'USD',
    })
    expect(result.ok && result.verdict).toBe('never')
    expect(result.ok && result.message).toMatch(
      /^The café wins over 1 year: buying out costs \$\d[\d,]* less than the machine\.$/,
    )
  })
})
