import { describe, expect, it } from 'vite-plus/test'

import { analyze } from '../../src/analyze'
import { DEFAULT_INPUTS } from '../../src/schema'

describe('analyze', () => {
  it('returns the summary, verdict and a quotable message', () => {
    const analysis = analyze({
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
    expect(analysis.summary.breakEvenMonths).toBeCloseTo(8)
    expect(analysis.verdict).toBe('solid')
    expect(analysis.message).toBe(
      'The machine pays for itself in 8 months and leaves €1,040 in your pocket over 2 years.',
    )
  })

  it('says the café wins when the machine never pays off', () => {
    const analysis = analyze({
      ...DEFAULT_INPUTS,
      cafePrice: 1,
      homeCostPerCup: 2,
      machinePrice: 500,
      yearlyMaintenance: 0,
      years: 1,
      currency: 'USD',
    })
    expect(analysis.verdict).toBe('cafe-wins')
    expect(analysis.message).toMatch(
      /^The café wins over 1 year: buying out costs \$\d[\d,]* less than the machine\.$/,
    )
  })

  it('ignores the display-only fields in the math', () => {
    const latte = analyze({ ...DEFAULT_INPUTS, drink: 'latte' })
    const mocha = analyze({ ...DEFAULT_INPUTS, drink: 'mocha' })
    expect(mocha.summary).toEqual(latte.summary)
  })
})
