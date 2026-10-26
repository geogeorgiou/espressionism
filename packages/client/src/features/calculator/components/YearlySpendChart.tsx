import { useMemo } from 'react'
import type { AxisOptions, UserSerie } from 'react-charts'
import { Chart } from 'react-charts'

import { ChartCard } from '@/features/common/components/ChartCard'
import { useTheme } from '@/features/theme/hooks/use-theme'

import type { CoffeeInputs } from '../utils/cost-model'
import { yearlySpend } from '../utils/cost-model'
import type { Currency } from '../utils/format'
import { formatMoney } from '../utils/format'
import { CAFE_LEGEND, HOME_LEGEND, SERIES_COLORS } from './chart-theme'

interface Datum {
  year: string
  spend: number
}

interface YearlySpendChartProps {
  inputs: CoffeeInputs
  currency: Currency
}

export function YearlySpendChart({ inputs, currency }: YearlySpendChartProps) {
  const { isDark: dark } = useTheme()
  const years = useMemo(() => yearlySpend(inputs), [inputs])

  const data = useMemo<UserSerie<Datum>[]>(
    () => [
      {
        label: 'Café',
        data: years.map((y) => ({ year: `Y${y.year}`, spend: y.cafe })),
      },
      {
        label: 'Machine',
        data: years.map((y) => ({ year: `Y${y.year}`, spend: y.home })),
      },
    ],
    [years],
  )

  const primaryAxis = useMemo<AxisOptions<Datum>>(
    () => ({ getValue: (d) => d.year, scaleType: 'band' }),
    [],
  )

  const secondaryAxes = useMemo<AxisOptions<Datum>[]>(
    () => [
      {
        getValue: (d) => d.spend,
        scaleType: 'linear',
        elementType: 'bar',
        min: 0,
        formatters: {
          scale: (v: number) => formatMoney(v, currency),
          tooltip: (v: number) => formatMoney(v, currency),
        },
      },
    ],
    [currency],
  )

  const first = years[0]
  const later = years[1]
  const summary = first
    ? `Year one: café ${formatMoney(first.cafe, currency)}, machine ${formatMoney(first.home, currency)} including its price.${
        later
          ? ` Each later year: café ${formatMoney(later.cafe, currency)}, machine ${formatMoney(later.home, currency)}.`
          : ''
      }`
    : ''

  return (
    <ChartCard
      title="Spend per year"
      description="Year one carries the machine. After that, only beans and upkeep."
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
