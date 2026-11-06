import { priceRange } from '@espressionism/store'

import { Button } from '@/components/ui/button'
import { withForm } from '@/features/common/form/form'

import { RATING_OPTIONS, SORT_OPTIONS } from '../constants'
import { storeFormOptions } from '../utils/form-options'

const RANGE = priceRange()

export const StoreFilters = withForm({
  ...storeFormOptions,
  props: {
    onReset: () => {},
  },
  render: function Render({ form, onReset }) {
    return (
      <form
        noValidate
        aria-label="Filter machines"
        className="grid grid-cols-2 items-start gap-4 lg:grid-cols-[1fr_1fr_1.3fr_1.5fr_auto]"
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit()
        }}
      >
        <form.AppField name="minPrice">
          {(field) => (
            <field.NumberField
              label="Min price"
              prefix="€"
              placeholder={String(RANGE.min)}
            />
          )}
        </form.AppField>
        <form.AppField name="maxPrice">
          {(field) => (
            <field.NumberField
              label="Max price"
              prefix="€"
              placeholder={String(RANGE.max)}
            />
          )}
        </form.AppField>
        <form.AppField name="minRating">
          {(field) => (
            <field.SelectField label="Rating" options={RATING_OPTIONS} />
          )}
        </form.AppField>
        <form.AppField name="sort">
          {(field) => (
            <field.SelectField label="Sort by" options={SORT_OPTIONS} />
          )}
        </form.AppField>
        {/* On one row (lg), a label-sized spacer lines the button up with the inputs. */}
        <div className="col-span-2 flex flex-col gap-2 lg:col-span-1">
          <span aria-hidden className="hidden text-sm leading-none lg:block">
            &nbsp;
          </span>
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
            className="h-11 border-2 border-foreground"
          >
            Reset filters
          </Button>
        </div>
      </form>
    )
  },
})
