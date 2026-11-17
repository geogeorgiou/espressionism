import type { ChartSeries, CupCostPoint } from '@espressionism/calculator'
import { useMemo } from 'react'
import type { AxisOptions, UserSerie } from 'react-charts'
import { Chart } from 'react-charts'

import { ChartCard } from '@/features/common/components/ChartCard'
import { useTheme } from '@/features/theme/hooks/use-theme'

import type { Currency } from '../utils/format'
import { formatMoney, formatMonthTick } from '../utils/format'
import { CAFE_LEGEND, HOME_LEGEND, SERIES_COLORS } from './chart-theme'

interface Datum {
  month: number
  price: number
}

interface CostPerCupChartProps {
  series: ChartSeries<CupCostPoint>
  /** Price of one café drink; caps the axis. */
  cafePrice: number
  currency: Currency
}

export function CostPerCupChart({
  series,
  cafePrice,
  currency,
}: CostPerCupChartProps) {
  const { isDark: dark } = useTheme()
  const { points, summary } = series

  const data = useMemo<UserSerie<Datum>[]>(
    () => [
      {
        label: 'Café cup',
        data: points.map((p) => ({ month: p.month, price: p.cafe })),
      },
      {
        label: 'Home cup',
        data: points.map((p) => ({ month: p.month, price: p.home })),
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
        tooltip: (m: number) => `After ${m} ${m === 1 ? 'month' : 'months'}`,
      },
    }),
    [],
  )

  // The first months are dominated by the machine price; cap the axis so the
  // interesting part (where home dips under the café) stays readable.
  const cap = cafePrice * 4
  const secondaryAxes = useMemo<AxisOptions<Datum>[]>(
    () => [
      {
        getValue: (d) => Math.min(d.price, cap),
        scaleType: 'linear',
        elementType: 'line',
        min: 0,
        hardMax: cap,
        formatters: {
          scale: (v: number) => formatMoney(v, currency, { cents: true }),
          tooltip: (v: number) =>
            v >= cap
              ? `${formatMoney(cap, currency, { cents: true })}+`
              : formatMoney(v, currency, { cents: true }),
        },
      },
    ],
    [cap, currency],
  )

  return (
    <ChartCard
      title="Real price of a home cup"
      description="Spread the machine over every cup you've made so far. It drops fast."
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
