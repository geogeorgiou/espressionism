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

  // €4 café cup, 260 cups a year, €1 home cup: €65 a month saved, so the
  // machine price alone sets the break-even (price / 65 months).
  const habit = {
    ...DEFAULT_INPUTS,
    cafePrice: 4,
    cupsPerDay: 1,
    daysPerWeek: 5,
    homeCostPerCup: 1,
    yearlyMaintenance: 0,
    currency: 'EUR' as const,
  }

  it.each([
    {
      name: 'fast',
      values: { ...habit, machinePrice: 260, years: 2 },
      verdict: 'fast',
      headline: 'Paid off in just 4 months.',
      net: 'Over 2 years the machine leaves €1,300 in your pocket.',
      breakEven: {
        value: '4 months',
        detail: 'You keep €780 a year after that',
      },
      cumulative: 'The lines cross around month 4.',
    },
    {
      name: 'solid',
      values: { ...habit, machinePrice: 520, years: 2 },
      verdict: 'solid',
      headline: 'Your machine pays for itself in 8 months.',
      net: 'Over 2 years the machine leaves €1,040 in your pocket.',
      breakEven: {
        value: '8 months',
        detail: 'You keep €780 a year after that',
      },
      cumulative: 'The lines cross around month 8.',
    },
    {
      name: 'slow',
      values: { ...habit, machinePrice: 1300, years: 2 },
      verdict: 'slow',
      headline: 'Pays off in 1 year 8 months. Slowly.',
      net: 'Over 2 years the machine leaves €260 in your pocket.',
      breakEven: {
        value: '1 year 8 months',
        detail: 'You keep €780 a year after that',
      },
      cumulative: 'The lines cross around month 20.',
    },
    {
      name: 'pays off only after the years compared',
      values: { ...habit, machinePrice: 5200, years: 5 },
      verdict: 'cafe-wins',
      headline: 'The café wins over 5 years.',
      net: 'Over 5 years buying out costs €1,300 less than the machine.',
      breakEven: {
        value: 'Not within 5 years',
        detail: 'Would pay off in 6 years 8 months',
      },
      cumulative: "The lines don't cross within 5 years.",
    },
    {
      name: 'never pays off',
      values: { ...habit, homeCostPerCup: 5, machinePrice: 500, years: 3 },
      verdict: 'cafe-wins',
      headline: 'The café wins over 3 years.',
      net: 'Over 3 years buying out costs €1,280 less than the machine.',
      breakEven: {
        value: 'Not within 3 years',
        detail: 'Home cups cost more than the café',
      },
      cumulative: 'The lines never cross.',
    },
  ])(
    'words the $name case to match its verdict',
    ({ values, verdict, headline, net, breakEven, cumulative }) => {
      const analysis = analyze(values)
      expect(analysis.verdict).toBe(verdict)
      expect(analysis.copy).toEqual({ headline, net, breakEven })
      expect(analysis.charts.cumulative.summary).toMatch(
        new RegExp(`${cumulative.replace('.', '\\.')}$`),
      )
    },
  )

  it('says the café wins in the agent sentence when break-even is too late', () => {
    expect(analyze({ ...habit, machinePrice: 5200, years: 5 }).message).toBe(
      'The café wins over 5 years: buying out costs €1,300 less than the machine.',
    )
  })

  it('writes one year in the singular everywhere', () => {
    const analysis = analyze({ ...habit, machinePrice: 520, years: 1 })
    expect(analysis.copy.net).toBe(
      'Over 1 year the machine leaves €260 in your pocket.',
    )
    expect(analysis.charts.cumulative.summary).toBe(
      'After 1 year the café totals €1,040 and the machine €780. The lines cross around month 8.',
    )
    expect(analysis.charts.costPerCup.summary).toBe(
      'A café cup is always €4.00. A home cup, machine included, falls to €3.00 after 1 year.',
    )
    expect(analysis.charts.yearly.summary).toBe(
      'Year one: café €1,040, machine €780 including its price.',
    )
  })

  it('describes the later years of the yearly chart', () => {
    expect(
      analyze({ ...habit, machinePrice: 520, years: 2 }).charts.yearly.summary,
    ).toBe(
      'Year one: café €1,040, machine €780 including its price. Each later year: café €1,040, machine €260.',
    )
  })

  it('ignores the display-only fields in the math', () => {
    const latte = analyze({ ...DEFAULT_INPUTS, drink: 'latte' })
    const mocha = analyze({ ...DEFAULT_INPUTS, drink: 'mocha' })
    expect(mocha.summary).toEqual(latte.summary)
  })
})
