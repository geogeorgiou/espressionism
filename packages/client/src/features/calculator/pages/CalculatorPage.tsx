import { ChatPanel } from '@/features/chat/components/ChatPanel'
import { MemoryOverview } from '@/features/chat/components/MemoryOverview'

import { CalculatorForm } from '../components/CalculatorForm'
import { CostPerCupChart } from '../components/CostPerCupChart'
import { CumulativeCostChart } from '../components/CumulativeCostChart'
import { StatsGrid } from '../components/StatsGrid'
import { VerdictPanel } from '../components/VerdictPanel'
import { YearlySpendChart } from '../components/YearlySpendChart'
import { useCalculator, useCalculatorUrl } from '../hooks/use-calculator'

export function CalculatorPage() {
  const { form, values, analysis, agentFills, chat } =
    useCalculator(useCalculatorUrl())

  return (
    <>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-6 pb-8 sm:px-6 lg:flex-row lg:items-start lg:gap-10">
        <section
          id="calculator"
          aria-labelledby="inputs-title"
          className="flex scroll-mt-6 flex-col gap-5 rounded-lg border-2 border-foreground bg-card p-5 shadow-pixel lg:sticky lg:top-6 lg:w-96 lg:shrink-0"
        >
          <div className="flex flex-col gap-1">
            <h2 id="inputs-title" className="font-pixel text-lg">
              Your numbers
            </h2>
            <p className="text-sm text-muted-foreground">
              Results update as you type.
            </p>
          </div>
          <CalculatorForm form={form} />
        </section>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <VerdictPanel
            analysis={analysis}
            flavor={values.drink}
            agentFills={agentFills}
          />
          <StatsGrid analysis={analysis} values={values} />
          <div id="charts" className="flex scroll-mt-6 flex-col gap-6">
            <CumulativeCostChart
              series={analysis.charts.cumulative}
              currency={values.currency}
            />
            <YearlySpendChart
              series={analysis.charts.yearly}
              currency={values.currency}
            />
            <CostPerCupChart
              series={analysis.charts.costPerCup}
              cafePrice={values.cafePrice}
              currency={values.currency}
            />
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <ChatPanel calculator={chat} />
        {import.meta.env.DEV && <MemoryOverview />}
      </div>
    </>
  )
}
