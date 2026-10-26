/**
 * The cost model behind Espressionism: buying coffee out every day versus
 * buying an espresso machine and brewing at home. Pure functions only.
 */

export const WEEKS_PER_YEAR = 52
export const MONTHS_PER_YEAR = 12

export interface CoffeeInputs {
  /** Price of one café drink. */
  cafePrice: number
  cupsPerDay: number
  /** Days per week you'd otherwise buy coffee out (1–7). */
  daysPerWeek: number
  /** One-off price of the machine (plus grinder, if any). */
  machinePrice: number
  /** Beans, milk and power for one home cup. */
  homeCostPerCup: number
  /** Descaling, filters, servicing per year. */
  yearlyMaintenance: number
  /** How many years to compare over. */
  years: number
}

export interface CoffeeSummary {
  cupsPerYear: number
  cafeYearly: number
  /** Running cost at home per year (ingredients + maintenance), machine excluded. */
  homeRunningYearly: number
  /** What you keep each year once the machine is paid for. */
  yearlySavings: number
  /** Months until the machine has paid for itself, or null if it never does. */
  breakEvenMonths: number | null
  cafeTotal: number
  homeTotal: number
  /** cafeTotal − homeTotal over the whole horizon. Negative means the café wins. */
  netSavings: number
  /** Home cost per cup over the horizon, machine price spread across every cup. */
  effectiveHomeCupCost: number
}

export interface CumulativePoint {
  month: number
  cafe: number
  home: number
}

export interface YearlyPoint {
  year: number
  cafe: number
  home: number
}

export interface CupCostPoint {
  month: number
  home: number
  cafe: number
}

export function cupsPerYear(inputs: CoffeeInputs): number {
  return inputs.cupsPerDay * inputs.daysPerWeek * WEEKS_PER_YEAR
}

export function summarize(inputs: CoffeeInputs): CoffeeSummary {
  const cups = cupsPerYear(inputs)
  const cafeYearly = cups * inputs.cafePrice
  const homeRunningYearly =
    cups * inputs.homeCostPerCup + inputs.yearlyMaintenance
  const yearlySavings = cafeYearly - homeRunningYearly
  const breakEvenMonths =
    yearlySavings > 0
      ? inputs.machinePrice / (yearlySavings / MONTHS_PER_YEAR)
      : null

  const cafeTotal = cafeYearly * inputs.years
  const homeTotal = inputs.machinePrice + homeRunningYearly * inputs.years
  const totalCups = cups * inputs.years

  return {
    cupsPerYear: cups,
    cafeYearly,
    homeRunningYearly,
    yearlySavings,
    breakEvenMonths,
    cafeTotal,
    homeTotal,
    netSavings: cafeTotal - homeTotal,
    effectiveHomeCupCost: totalCups > 0 ? homeTotal / totalCups : 0,
  }
}

/** Running totals for both options, one point per month from month 0. */
export function cumulativeCosts(inputs: CoffeeInputs): CumulativePoint[] {
  const { cafeYearly, homeRunningYearly } = summarize(inputs)
  const months = Math.round(inputs.years * MONTHS_PER_YEAR)
  return Array.from({ length: months + 1 }, (_, month) => ({
    month,
    cafe: (cafeYearly / MONTHS_PER_YEAR) * month,
    home: inputs.machinePrice + (homeRunningYearly / MONTHS_PER_YEAR) * month,
  }))
}

/** Spend in each year of ownership; the machine is paid in year 1. */
export function yearlySpend(inputs: CoffeeInputs): YearlyPoint[] {
  const { cafeYearly, homeRunningYearly } = summarize(inputs)
  return Array.from({ length: Math.round(inputs.years) }, (_, i) => ({
    year: i + 1,
    cafe: cafeYearly,
    home: homeRunningYearly + (i === 0 ? inputs.machinePrice : 0),
  }))
}

/**
 * The real price of a home cup if you stopped after `month` months:
 * everything spent so far divided by every cup made so far.
 */
export function costPerCupOverTime(inputs: CoffeeInputs): CupCostPoint[] {
  const { cupsPerYear: cups, homeRunningYearly } = summarize(inputs)
  const months = Math.round(inputs.years * MONTHS_PER_YEAR)
  if (cups <= 0) return []
  return Array.from({ length: months }, (_, i) => {
    const month = i + 1
    const spent =
      inputs.machinePrice + (homeRunningYearly / MONTHS_PER_YEAR) * month
    const madeCups = (cups / MONTHS_PER_YEAR) * month
    return { month, home: spent / madeCups, cafe: inputs.cafePrice }
  })
}

export type Verdict = 'never' | 'fast' | 'solid' | 'slow'

/** A plain-language read on the result, used for copy and the mascot's mood. */
export function verdictFor(summary: CoffeeSummary, years: number): Verdict {
  const { breakEvenMonths } = summary
  if (breakEvenMonths === null || breakEvenMonths > years * MONTHS_PER_YEAR) {
    return 'never'
  }
  if (breakEvenMonths <= 6) return 'fast'
  if (breakEvenMonths <= 18) return 'solid'
  return 'slow'
}
