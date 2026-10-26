import { describe, expect, it } from 'vite-plus/test'

import type { CoffeeInputs } from '@/features/calculator/utils/cost-model'
import {
  costPerCupOverTime,
  cumulativeCosts,
  summarize,
  verdictFor,
  yearlySpend,
} from '@/features/calculator/utils/cost-model'

const base: CoffeeInputs = {
  cafePrice: 4,
  cupsPerDay: 1,
  daysPerWeek: 5,
  machinePrice: 520,
  homeCostPerCup: 1,
  yearlyMaintenance: 0,
  years: 2,
}

describe('summarize', () => {
  it('works out yearly spend and break-even', () => {
    const s = summarize(base)
    expect(s.cupsPerYear).toBe(260)
    expect(s.cafeYearly).toBe(1040)
    expect(s.homeRunningYearly).toBe(260)
    expect(s.yearlySavings).toBe(780)
    // 520 / (780 / 12) = 8 months
    expect(s.breakEvenMonths).toBeCloseTo(8)
  })

  it('totals both options over the horizon', () => {
    const s = summarize(base)
    expect(s.cafeTotal).toBe(2080)
    expect(s.homeTotal).toBe(520 + 520)
    expect(s.netSavings).toBe(1040)
    expect(s.effectiveHomeCupCost).toBe(2)
  })

  it('never breaks even when a home cup costs as much as the café', () => {
    const s = summarize({ ...base, homeCostPerCup: 4 })
    expect(s.breakEvenMonths).toBeNull()
    expect(s.netSavings).toBe(-520)
  })
})

describe('series', () => {
  it('starts the machine line at the machine price', () => {
    const points = cumulativeCosts(base)
    expect(points).toHaveLength(25)
    expect(points[0]).toEqual({ month: 0, cafe: 0, home: 520 })
    expect(points[24].cafe).toBeCloseTo(2080)
  })

  it('charges the machine in year one only', () => {
    expect(yearlySpend(base)).toEqual([
      { year: 1, cafe: 1040, home: 780 },
      { year: 2, cafe: 1040, home: 260 },
    ])
  })

  it('makes home cups cheaper the longer you own the machine', () => {
    const points = costPerCupOverTime(base)
    expect(points).toHaveLength(24)
    expect(points[0].home).toBeGreaterThan(points[23].home)
    expect(points[23].home).toBeCloseTo(2)
    expect(points[0].cafe).toBe(4)
  })
})

describe('verdictFor', () => {
  it('grades how fast the machine pays off', () => {
    expect(verdictFor(summarize({ ...base, machinePrice: 300 }), 2)).toBe(
      'fast',
    )
    expect(verdictFor(summarize(base), 2)).toBe('solid')
    expect(verdictFor(summarize({ ...base, machinePrice: 1500 }), 2)).toBe(
      'slow',
    )
    expect(verdictFor(summarize({ ...base, machinePrice: 5000 }), 2)).toBe(
      'never',
    )
  })
})
