import { useSelector } from '@tanstack/react-form'
import type { ReactNode } from 'react'

import { withForm } from '@/features/common/form/form'
import { MASCOT_FLAVORS } from '@/features/mascot/utils/sprite'

import { DRINK_LABELS } from '../constants'
import { calculatorFormOptions } from '../utils/form-options'
import { CURRENCIES, CURRENCY_SYMBOLS } from '../utils/format'

const DRINK_OPTIONS = MASCOT_FLAVORS.map((value) => ({
  value,
  label: DRINK_LABELS[value],
}))
const CURRENCY_OPTIONS = CURRENCIES.map((value) => ({
  value,
  label: `${CURRENCY_SYMBOLS[value]} ${value}`,
}))

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-4 font-pixel text-sm tracking-wide text-brew uppercase">
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

export const CalculatorForm = withForm({
  ...calculatorFormOptions,
  render: function Render({ form }) {
    const currency = useSelector(form.store, (state) => state.values.currency)
    const symbol = CURRENCY_SYMBOLS[currency]

    return (
      <form
        noValidate
        aria-label="Coffee habit and machine costs"
        className="flex flex-col gap-8"
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit()
        }}
      >
        <Section title="Your café habit">
          <form.AppField name="drink">
            {(field) => (
              <field.SelectField label="Usual order" options={DRINK_OPTIONS} />
            )}
          </form.AppField>
          <form.AppField name="cafePrice">
            {(field) => (
              <field.NumberField label="Price per drink" prefix={symbol} />
            )}
          </form.AppField>
          <div className="grid grid-cols-2 gap-4">
            <form.AppField name="cupsPerDay">
              {(field) => (
                <field.NumberField label="Cups a day" suffix="cups" integer />
              )}
            </form.AppField>
            <form.AppField name="daysPerWeek">
              {(field) => (
                <field.NumberField label="Days a week" suffix="days" integer />
              )}
            </form.AppField>
          </div>
        </Section>

        <Section title="The machine">
          <form.AppField name="machinePrice">
            {(field) => (
              <field.NumberField
                label="Machine price"
                hint="Include a grinder if you need one."
                prefix={symbol}
              />
            )}
          </form.AppField>
          <form.AppField name="homeCostPerCup">
            {(field) => (
              <field.NumberField
                label="Cost per home cup"
                hint="Beans, milk and power for one drink."
                prefix={symbol}
              />
            )}
          </form.AppField>
          <form.AppField name="yearlyMaintenance">
            {(field) => (
              <field.NumberField
                label="Upkeep per year"
                hint="Descaler, filters, the odd service."
                prefix={symbol}
              />
            )}
          </form.AppField>
        </Section>

        <Section title="Compare">
          <div className="grid grid-cols-2 gap-4">
            <form.AppField name="years">
              {(field) => (
                <field.NumberField label="Over" suffix="years" integer />
              )}
            </form.AppField>
            <form.AppField name="currency">
              {(field) => (
                <field.SelectField
                  label="Currency"
                  options={CURRENCY_OPTIONS}
                />
              )}
            </form.AppField>
          </div>
        </Section>
      </form>
    )
  },
})
