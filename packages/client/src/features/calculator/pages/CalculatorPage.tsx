import { useSelector } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'

import { useAppForm } from '@/features/common/form/form'
import { useToolInvokedAt } from '@/features/webmcp/hooks/use-webmcp-tool'
import { Route } from '@/routes/index'

import { CalculatorForm } from '../components/CalculatorForm'
import { CostPerCupChart } from '../components/CostPerCupChart'
import { CumulativeCostChart } from '../components/CumulativeCostChart'
import { StatsGrid } from '../components/StatsGrid'
import { VerdictPanel } from '../components/VerdictPanel'
import { YearlySpendChart } from '../components/YearlySpendChart'
import type { CalculatorValues } from '../constants'
import { DEFAULT_INPUTS, calculatorSchema } from '../constants'
import {
  CALCULATOR_TOOL_NAME,
  useCalculatorTool,
} from '../hooks/use-calculator-tool'
import { summarize, verdictFor } from '../utils/cost-model'
import { calculatorFormOptions } from '../utils/form-options'
import { toCoffeeInputs } from '../utils/inputs'

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

  // WebMCP: let an agent fill the form through the same path as typing.
  useCalculatorTool({
    getValues: () => form.state.values,
    setValue: (name, value) => form.setFieldValue(name, value),
  })
  const agentFilledAt = useToolInvokedAt(CALCULATOR_TOOL_NAME)

  // Results follow the last valid answers: while a field is half-typed or
  // invalid, fall back to what's in the URL (the last valid, synced values).
  const values = useSelector(form.store, (state) => state.values)
  const parsed = calculatorSchema.safeParse(values)
  const committed: CalculatorValues = parsed.success
    ? parsed.data
    : { ...DEFAULT_INPUTS, ...search }
  const inputs = toCoffeeInputs(committed)
  const summary = summarize(inputs)
  const verdict = verdictFor(summary, inputs.years)

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-6 pb-16 sm:px-6 lg:flex-row lg:items-start lg:gap-10">
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
          verdict={verdict}
          summary={summary}
          years={inputs.years}
          currency={committed.currency}
          flavor={committed.drink}
          agentFilledAt={agentFilledAt}
        />
        <StatsGrid
          summary={summary}
          inputs={inputs}
          currency={committed.currency}
        />
        <div id="charts" className="flex scroll-mt-6 flex-col gap-6">
          <CumulativeCostChart
            inputs={inputs}
            currency={committed.currency}
            breakEvenMonths={summary.breakEvenMonths}
          />
          <YearlySpendChart inputs={inputs} currency={committed.currency} />
          <CostPerCupChart inputs={inputs} currency={committed.currency} />
        </div>
      </div>
    </div>
  )
}
