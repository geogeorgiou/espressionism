import { z } from 'zod'

import type { MascotFlavor } from '@/features/mascot/utils/sprite'
import { MASCOT_FLAVORS } from '@/features/mascot/utils/sprite'

import { CURRENCIES } from '../utils/format'

export const DRINK_LABELS: Record<MascotFlavor, string> = {
  house: 'House coffee',
  latte: 'Latte',
  mocha: 'Mocha',
  matcha: 'Matcha latte',
  cherry: 'Seasonal special',
}

/** Starting values: a weekday flat-white habit and a mid-range machine. */
export const DEFAULT_INPUTS: CalculatorValues = {
  drink: 'latte',
  currency: 'EUR',
  cafePrice: 3.5,
  cupsPerDay: 1,
  daysPerWeek: 5,
  machinePrice: 600,
  homeCostPerCup: 0.45,
  yearlyMaintenance: 40,
  years: 5,
}

const money = (label: string, max: number) =>
  z
    .number({ invalid_type_error: `${label} is required` })
    .min(0, `${label} can't be negative`)
    .max(max, `${label} looks too high`)

export const calculatorSchema = z.object({
  drink: z.enum(MASCOT_FLAVORS),
  currency: z.enum(CURRENCIES),
  cafePrice: money('Café price', 50).refine((v) => v > 0, {
    message: 'Café price must be above zero',
  }),
  cupsPerDay: z
    .number({ invalid_type_error: 'Cups per day is required' })
    .int('Use whole cups')
    .min(1, 'At least one cup')
    .max(10, 'Ten cups is plenty'),
  daysPerWeek: z
    .number({ invalid_type_error: 'Days per week is required' })
    .int('Use whole days')
    .min(1, 'At least one day')
    .max(7, 'A week has seven days'),
  machinePrice: money('Machine price', 20000),
  homeCostPerCup: money('Home cost per cup', 20),
  yearlyMaintenance: money('Maintenance', 5000),
  years: z
    .number({ invalid_type_error: 'Years is required' })
    .int('Use whole years')
    .min(1, 'At least one year')
    .max(10, 'Up to ten years'),
})

export type CalculatorValues = z.infer<typeof calculatorSchema>

/** URL search params: every field optional, invalid values fall back. */
export const calculatorSearchSchema = z.object({
  drink: z.enum(MASCOT_FLAVORS).optional().catch(undefined),
  currency: z.enum(CURRENCIES).optional().catch(undefined),
  cafePrice: z.number().positive().max(50).optional().catch(undefined),
  cupsPerDay: z.number().int().min(1).max(10).optional().catch(undefined),
  daysPerWeek: z.number().int().min(1).max(7).optional().catch(undefined),
  machinePrice: z.number().min(0).max(20000).optional().catch(undefined),
  homeCostPerCup: z.number().min(0).max(20).optional().catch(undefined),
  yearlyMaintenance: z.number().min(0).max(5000).optional().catch(undefined),
  years: z.number().int().min(1).max(10).optional().catch(undefined),
})

export type CalculatorSearch = z.infer<typeof calculatorSearchSchema>
