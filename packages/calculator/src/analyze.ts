import type {
  CoffeeSummary,
  CumulativePoint,
  CupCostPoint,
  Verdict,
  YearlyPoint,
} from './cost-model'
import {
  costPerCupOverTime,
  cumulativeCosts,
  summarize,
  verdictFor,
  yearlySpend,
} from './cost-model'
import { formatDuration, formatMoney, formatYears } from './format'
import type { CalculatorValues } from './schema'

/** The page's wording for an analysis, in the chosen currency. */
export interface AnalysisCopy {
  /** The verdict, in the page's voice: "Paid off in just 4 months." */
  headline: string
  /** What the net savings mean over the years compared. */
  net: string
  /** The break-even stat: "8 months" or "Not within 5 years", and a detail. */
  breakEven: { value: string; detail: string }
}

/** One chart's points and the sentence a screen reader hears for it. */
export interface ChartSeries<P> {
  points: P[]
  summary: string
}

/** The calculator's read on a set of values. */
export interface Analysis {
  summary: CoffeeSummary
  verdict: Verdict
  /** One sentence an agent can quote, in the chosen currency. */
  message: string
  copy: AnalysisCopy
  charts: {
    cumulative: ChartSeries<CumulativePoint>
    yearly: ChartSeries<YearlyPoint>
    costPerCup: ChartSeries<CupCostPoint>
  }
}

/**
 * Everything below reads the verdict, never `breakEvenMonths` alone: a
 * machine that would pay off only after the years compared is still a
 * café win.
 */
interface Read {
  summary: CoffeeSummary
  verdict: Verdict
  values: CalculatorValues
  paysOff: boolean
  span: string
  money: (value: number, options?: { cents?: boolean }) => string
}

function verdictMessage({ summary, paysOff, span, money }: Read): string {
  const net = money(Math.abs(summary.netSavings))
  if (!paysOff || summary.breakEvenMonths === null) {
    return `The café wins over ${span}: buying out costs ${net} less than the machine.`
  }
  const when = formatDuration(summary.breakEvenMonths)
  return `The machine pays for itself in ${when} and leaves ${net} in your pocket over ${span}.`
}

function headline({ summary, verdict, paysOff, span }: Read): string {
  if (!paysOff || summary.breakEvenMonths === null) {
    return `The café wins over ${span}.`
  }
  const when = formatDuration(summary.breakEvenMonths)
  if (verdict === 'fast') return `Paid off in just ${when}.`
  if (verdict === 'slow') return `Pays off in ${when}. Slowly.`
  return `Your machine pays for itself in ${when}.`
}

function netLine({ summary, paysOff, span, money }: Read): string {
  const net = money(Math.abs(summary.netSavings))
  return paysOff
    ? `Over ${span} the machine leaves ${net} in your pocket.`
    : `Over ${span} buying out costs ${net} less than the machine.`
}

function breakEvenStat({
  summary,
  paysOff,
  span,
  money,
}: Read): AnalysisCopy['breakEven'] {
  const { breakEvenMonths, yearlySavings } = summary
  if (breakEvenMonths === null) {
    return {
      value: `Not within ${span}`,
      detail: 'Home cups cost more than the café',
    }
  }
  if (!paysOff) {
    return {
      value: `Not within ${span}`,
      detail: `Would pay off in ${formatDuration(breakEvenMonths)}`,
    }
  }
  return {
    value: formatDuration(breakEvenMonths),
    detail: `You keep ${money(yearlySavings)} a year after that`,
  }
}

function cumulativeSummary(
  points: CumulativePoint[],
  { summary, paysOff, span, money }: Read,
): string {
  const last = points.at(-1)
  if (!last) return ''
  const totals = `After ${span} the café totals ${money(last.cafe)} and the machine ${money(last.home)}.`
  if (summary.breakEvenMonths === null)
    return `${totals} The lines never cross.`
  if (!paysOff) return `${totals} The lines don't cross within ${span}.`
  return `${totals} The lines cross around month ${Math.ceil(summary.breakEvenMonths)}.`
}

function yearlySummary(points: YearlyPoint[], { money }: Read): string {
  const [first, later] = points
  if (!first) return ''
  const yearOne = `Year one: café ${money(first.cafe)}, machine ${money(first.home)} including its price.`
  if (!later) return yearOne
  return `${yearOne} Each later year: café ${money(later.cafe)}, machine ${money(later.home)}.`
}

function costPerCupSummary(
  points: CupCostPoint[],
  { values, span, money }: Read,
): string {
  const last = points.at(-1)
  if (!last) return ''
  const cents = { cents: true }
  return `A café cup is always ${money(values.cafePrice, cents)}. A home cup, machine included, falls to ${money(last.home, cents)} after ${span}.`
}

/**
 * Break-even, totals, a verdict, a quotable sentence, the page's wording and
 * the chart series for valid values. The page, Robospresso and WebMCP all
 * read results through here.
 */
export function analyze(values: CalculatorValues): Analysis {
  const summary = summarize(values)
  const verdict = verdictFor(summary, values.years)
  const read: Read = {
    summary,
    verdict,
    values,
    paysOff: verdict !== 'cafe-wins',
    span: formatYears(values.years),
    money: (value, options) => formatMoney(value, values.currency, options),
  }

  const cumulative = cumulativeCosts(values)
  const yearly = yearlySpend(values)
  const costPerCup = costPerCupOverTime(values)

  return {
    summary,
    verdict,
    message: verdictMessage(read),
    copy: {
      headline: headline(read),
      net: netLine(read),
      breakEven: breakEvenStat(read),
    },
    charts: {
      cumulative: {
        points: cumulative,
        summary: cumulativeSummary(cumulative, read),
      },
      yearly: { points: yearly, summary: yearlySummary(yearly, read) },
      costPerCup: {
        points: costPerCup,
        summary: costPerCupSummary(costPerCup, read),
      },
    },
  }
}
