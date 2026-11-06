import { CATALOG, searchMachines } from '@espressionism/store'
import { useSelector } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { useAppForm } from '@/features/common/form/form'
import { Route } from '@/routes/store'

import { MachineCard } from '../components/MachineCard'
import { StoreFilters } from '../components/StoreFilters'
import type { StoreSearch } from '../constants'
import { EMPTY_FILTERS, STORE_DISCLAIMER, storeFormSchema } from '../constants'
import { storeFormOptions } from '../utils/form-options'
import { formatCount } from '../utils/format'
import {
  compactSearch,
  formToSearch,
  searchToForm,
  searchToQuery,
} from '../utils/query'

export function StorePage() {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })

  const syncUrl = (next: StoreSearch) =>
    navigate({
      search: compactSearch(next),
      replace: true,
      resetScroll: false,
    })

  const form = useAppForm({
    ...storeFormOptions,
    defaultValues: searchToForm(search),
    listeners: {
      // Keep the URL in sync so a filtered view can be shared or reloaded.
      onChangeDebounceMs: 300,
      onChange: ({ formApi }) => {
        const parsed = storeFormSchema.safeParse(formApi.state.values)
        if (parsed.success) void syncUrl(formToSearch(parsed.data))
      },
    },
  })

  // Results follow the last valid filters: while a price is half-typed or the
  // range is upside down, fall back to what's in the URL.
  const values = useSelector(form.store, (state) => state.values)
  const parsed = storeFormSchema.safeParse(values)
  const committed = compactSearch(
    parsed.success ? formToSearch(parsed.data) : search,
  )
  const machines = searchMachines(searchToQuery(committed))

  const reset = () => {
    form.reset(EMPTY_FILTERS)
    void syncUrl({})
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6 pb-16 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-pixel text-2xl leading-tight sm:text-4xl">
          The machine shop
        </h1>
        <p className="text-base text-muted-foreground sm:text-lg">
          Espresso machines for every budget, best rated first.
        </p>
        <p className="w-fit rounded-md border-2 border-dashed border-foreground/40 px-3 py-1 text-sm">
          {STORE_DISCLAIMER}
        </p>
      </div>

      <section
        aria-label="Filters"
        className="rounded-lg border-2 border-foreground bg-card p-5 shadow-pixel"
      >
        <StoreFilters form={form} onReset={reset} />
      </section>

      <p aria-live="polite" className="font-semibold">
        {formatCount(machines.length, CATALOG.length)}
      </p>

      {machines.length > 0 ? (
        <ul
          aria-label="Machines"
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {machines.map((machine) => (
            <li key={machine.slug}>
              <MachineCard machine={machine} search={committed} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col items-start gap-3 rounded-lg border-2 border-dashed border-foreground/40 p-6">
          <p className="font-pixel text-lg">No machines match</p>
          <p className="text-muted-foreground">
            Try a wider price range or a lower rating.
          </p>
          <Button
            type="button"
            onClick={reset}
            className="h-11 border-2 border-foreground"
          >
            Show all machines
          </Button>
        </div>
      )}
    </div>
  )
}
