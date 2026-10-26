import { clsx } from 'clsx'

import type { CoffeeInputs, CoffeeSummary } from '../utils/cost-model'
import type { Currency } from '../utils/format'
import { formatDuration, formatMoney } from '../utils/format'

interface StatsGridProps {
  summary: CoffeeSummary
  inputs: CoffeeInputs
  currency: Currency
}

interface Stat {
  label: string
  value: string
  detail: string
  tone?: 'cafe' | 'home'
}

export function StatsGrid({ summary, inputs, currency }: StatsGridProps) {
  const money = (v: number) => formatMoney(v, currency)
  const stats: Stat[] = [
    {
      label: 'Café per year',
      value: money(summary.cafeYearly),
      detail: `${summary.cupsPerYear} drinks at ${formatMoney(inputs.cafePrice, currency, { cents: true })}`,
      tone: 'cafe',
    },
    {
      label: 'Home per year',
      value: money(summary.homeRunningYearly),
      detail: 'Beans, milk and upkeep, after the machine',
      tone: 'home',
    },
    {
      label: 'Break-even',
      value:
        summary.breakEvenMonths === null
          ? 'Never'
          : formatDuration(summary.breakEvenMonths),
      detail:
        summary.yearlySavings > 0
          ? `You keep ${money(summary.yearlySavings)} a year after that`
          : 'Home cups cost more than the café',
    },
    {
      label: 'Real cost per home cup',
      value: formatMoney(summary.effectiveHomeCupCost, currency, {
        cents: true,
      }),
      detail: `Machine included, over ${inputs.years} ${inputs.years === 1 ? 'year' : 'years'}`,
    },
  ]

  return (
    <dl className="grid grid-cols-2 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex flex-col gap-1 rounded-lg border-2 border-foreground bg-card p-3"
        >
          <dt className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {stat.tone && (
              <span
                aria-hidden
                className={clsx(
                  'size-2.5 shrink-0 rounded-[2px]',
                  stat.tone === 'cafe' ? 'bg-chart-cafe' : 'bg-chart-home',
                )}
              />
            )}
            {stat.label}
          </dt>
          <dd className="font-pixel text-lg leading-tight sm:text-xl">
            {stat.value}
          </dd>
          <dd className="text-sm text-muted-foreground">{stat.detail}</dd>
        </div>
      ))}
    </dl>
  )
}
