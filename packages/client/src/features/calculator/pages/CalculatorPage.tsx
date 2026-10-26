import { useSelector } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'

import { useAppForm } from '@/features/common/form/form'
import { Route } from '@/routes/index'

import { CalculatorForm } from '../components/CalculatorForm'
import { CostPerCupChart } from '../components/CostPerCupChart'
import { CumulativeCostChart } from '../components/CumulativeCostChart'
import { StatsGrid } from '../components/StatsGrid'
import { VerdictPanel } from '../components/VerdictPanel'
import { YearlySpendChart } from '../components/YearlySpendChart'
import type { CalculatorValues } from '../constants'
import { DEFAULT_INPUTS, calculatorSchema } from '../constants'
import type { CoffeeInputs } from '../utils/cost-model'
import { summarize, verdictFor } from '../utils/cost-model'
import { calculatorFormOptions } from '../utils/form-options'

function toInputs(values: CalculatorValues): CoffeeInputs {
  const { drink: _drink, currency: _currency, ...inputs } = values
  return inputs
}

export function CalculatorPage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const form = useAppForm({
    ...calculatorFormOptions,
    defaultValues: { ...DEFAULT_INPUTS, ...search },
    listeners: {
      // Keep the URL in sync so a result can be bookmarked or shared.
      onChangeDebounceMs: 400,
      onChange: ({ formApi }) => {
        const parsed = calculatorSchema.safeParse(formApi.state.values)
        if (!parsed.success) return
        void navigate({
          search: parsed.data,
          replace: true,
          resetScroll: false,
        })
      },
    },
  })

  // Results follow the last valid answers: while a field is half-typed or
  // invalid, fall back to what's in the URL (the last valid, synced values).
  const values = useSelector(form.store, (state) => state.values)
  const parsed = calculatorSchema.safeParse(values)
  const committed: CalculatorValues = parsed.success
    ? parsed.data
    : { ...DEFAULT_INPUTS, ...search }
  const inputs = toInputs(committed)
  const summary = summarize(inputs)
  const verdict = verdictFor(summary, inputs.years)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-6 pb-16 sm:px-6 lg:flex-row lg:items-start lg:gap-10">
      <section
        aria-labelledby="inputs-title"
        className="flex flex-col gap-5 rounded-lg border-2 border-foreground bg-card p-5 shadow-pixel lg:sticky lg:top-6 lg:w-96 lg:shrink-0"
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
          verdict={verdict}
          summary={summary}
          years={inputs.years}
          currency={committed.currency}
          flavor={committed.drink}
        />
        <StatsGrid
          summary={summary}
          inputs={inputs}
          currency={committed.currency}
        />
        <CumulativeCostChart
          inputs={inputs}
          currency={committed.currency}
          breakEvenMonths={summary.breakEvenMonths}
        />
        <YearlySpendChart inputs={inputs} currency={committed.currency} />
        <CostPerCupChart inputs={inputs} currency={committed.currency} />
      </div>
    </div>
  )
}
