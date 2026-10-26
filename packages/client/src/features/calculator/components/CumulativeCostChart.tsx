import { useMemo } from 'react'
import type { AxisOptions, UserSerie } from 'react-charts'
import { Chart } from 'react-charts'

import { ChartCard } from '@/features/common/components/ChartCard'
import { useTheme } from '@/features/theme/hooks/use-theme'

import type { CoffeeInputs, CumulativePoint } from '../utils/cost-model'
import { cumulativeCosts } from '../utils/cost-model'
import type { Currency } from '../utils/format'
import { formatMoney, formatMonthTick } from '../utils/format'
import { CAFE_LEGEND, HOME_LEGEND, SERIES_COLORS } from './chart-theme'

interface Datum {
  month: number
  total: number
}

interface CumulativeCostChartProps {
  inputs: CoffeeInputs
  currency: Currency
  breakEvenMonths: number | null
}

export function CumulativeCostChart({
  inputs,
  currency,
  breakEvenMonths,
}: CumulativeCostChartProps) {
  const { isDark: dark } = useTheme()
  const points = useMemo(() => cumulativeCosts(inputs), [inputs])
  const last: CumulativePoint | undefined = points.at(-1)

  const data = useMemo<UserSerie<Datum>[]>(
    () => [
      {
        label: 'Café',
        data: points.map((p) => ({ month: p.month, total: p.cafe })),
      },
      {
        label: 'Machine',
        data: points.map((p) => ({ month: p.month, total: p.home })),
      },
    ],
    [points],
  )

  const primaryAxis = useMemo<AxisOptions<Datum>>(
    () => ({
      getValue: (d) => d.month,
      scaleType: 'linear',
      formatters: {
        scale: (m: number) => formatMonthTick(m),
        tooltip: (m: number) => (m === 0 ? 'Day one' : `Month ${m}`),
      },
    }),
    [],
  )

  const secondaryAxes = useMemo<AxisOptions<Datum>[]>(
    () => [
      {
        getValue: (d) => d.total,
        scaleType: 'linear',
        elementType: 'line',
        min: 0,
        formatters: {
          scale: (v: number) => formatMoney(v, currency),
          tooltip: (v: number) => formatMoney(v, currency),
        },
      },
    ],
    [currency],
  )

  const summary = last
    ? `After ${inputs.years} years the café totals ${formatMoney(last.cafe, currency)} and the machine ${formatMoney(last.home, currency)}.${
        breakEvenMonths === null
          ? ' The lines never cross.'
          : ` The lines cross around month ${Math.ceil(breakEvenMonths)}.`
      }`
    : ''

  return (
    <ChartCard
      title="Total spent over time"
      description="Where the lines cross, the machine has paid for itself."
      legend={[CAFE_LEGEND, HOME_LEGEND]}
      summary={summary}
    >
      <Chart
        options={{
          data,
          primaryAxis,
          secondaryAxes,
          dark,
          defaultColors: SERIES_COLORS,
          tooltip: true,
        }}
      />
    </ChartCard>
  )
}
