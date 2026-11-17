import { describe, expect, it } from 'vite-plus/test'

import {
  DEFAULT_INPUTS,
  calculatorSchema,
  calculatorSearchSchema,
} from '@/features/calculator/constants'

describe('calculatorSearchSchema', () => {
  it('keeps every valid calculator value as it is', () => {
    const values = {
      drink: 'mocha',
      currency: 'GBP',
      cafePrice: 50,
      cupsPerDay: 10,
      daysPerWeek: 7,
      machinePrice: 20000,
      homeCostPerCup: 0,
      yearlyMaintenance: 5000,
      years: 1,
    }
    expect(calculatorSearchSchema.parse(values)).toEqual(values)
    expect(calculatorSearchSchema.parse(DEFAULT_INPUTS)).toEqual(DEFAULT_INPUTS)
  })

  it('accepts no params at all', () => {
    expect(calculatorSearchSchema.parse({})).toEqual({})
  })

  it.each([
    ['drink', 'espresso-tonic'],
    ['currency', 'JPY'],
    ['cafePrice', 0],
    ['cafePrice', 50.5],
    ['cupsPerDay', 11],
    ['cupsPerDay', 1.5],
    ['daysPerWeek', 8],
    ['machinePrice', -1],
    ['homeCostPerCup', 21],
    ['yearlyMaintenance', 5001],
    ['years', 0],
    ['years', 'five'],
  ])('drops a bad %s (%j) and keeps the rest', (field, bad) => {
    const parsed = calculatorSearchSchema.parse({
      ...DEFAULT_INPUTS,
      [field]: bad,
    })
    expect(parsed).toEqual({ ...DEFAULT_INPUTS, [field]: undefined })
  })

  it('accepts exactly what the shared rules accept, field by field', () => {
    // Around every bound the calculator has, plus a few non-numbers.
    const probes = [
      -1,
      0,
      0.5,
      1,
      1.5,
      7,
      8,
      10,
      11,
      20,
      21,
      50,
      50.5,
      5000,
      5001,
      20000,
      20001,
      'latte',
      'EUR',
      'JPY',
      null,
    ]
    const shared = calculatorSchema.shape
    const url = calculatorSearchSchema.shape
    for (const field of Object.keys(shared) as (keyof typeof shared)[]) {
      for (const probe of probes) {
        const allowed = shared[field].safeParse(probe).success
        const kept = url[field].parse(probe) !== undefined
        expect({ field, probe, kept }).toEqual({ field, probe, kept: allowed })
      }
    }
  })

  it('has a param for every calculator field, and no others', () => {
    expect(Object.keys(calculatorSearchSchema.shape).toSorted()).toEqual(
      Object.keys(calculatorSchema.shape).toSorted(),
    )
  })
})
