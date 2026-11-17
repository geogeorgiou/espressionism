import { searchMachines, searchTool } from '@espressionism/store'
import type { Machine } from '@espressionism/store'
import { useSelector } from '@tanstack/react-form'
import { useNavigate } from '@tanstack/react-router'
import { useCallback } from 'react'

import { useAppForm } from '@/features/common/form/form'
import { useWebMcpTool } from '@/features/webmcp/hooks/use-webmcp-tool'
import { Route } from '@/routes/store'

import type { StoreFormValues, StoreSearch } from '../constants'
import { EMPTY_FILTERS, storeFormSchema } from '../constants'
import { storeFormOptions } from '../utils/form-options'
import {
  agentSearchToForm,
  compactSearch,
  formToSearch,
  searchToForm,
  searchToQuery,
} from '../utils/query'

/** Where the store's last valid filters live between visits. */
export interface StoreUrl {
  /** The search params in the URL now, already validated. */
  search: StoreSearch
  /** Replaces the URL's search params, without a history entry or a scroll. */
  save: (search: StoreSearch) => void
}

/** Wait after the last change before the URL follows the filters. */
const URL_SYNC_MS = 300

const ANNOTATIONS: WebMCP.ToolAnnotations = {
  // It changes what the page shows, never any data.
  readOnlyHint: true,
  untrustedContentHint: false,
  consequentialHint: false,
  debugging: false,
}

/** The store route's URL, as `useStoreFilters` reads and writes it. */
export function useStoreUrl(): StoreUrl {
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  return {
    search,
    save: (next) =>
      void navigate({ search: next, replace: true, resetScroll: false }),
  }
}

export interface StoreFilters {
  /** The filter form. */
  form: ReturnType<typeof useStoreForm>
  /** The filters the results follow, as tidy search params for links. */
  search: StoreSearch
  /** The machines matching `search`, in its order. */
  machines: Machine[]
  /** Back to every machine, best rated first. */
  reset: () => void
}

function useStoreForm(save: StoreUrl['save'], search: StoreSearch) {
  return useAppForm({
    ...storeFormOptions,
    defaultValues: searchToForm(search),
    listeners: {
      onChangeDebounceMs: URL_SYNC_MS,
      onChange: ({ formApi }) => {
        const parsed = storeFormSchema.safeParse(formApi.state.values)
        if (parsed.success) save(compactSearch(formToSearch(parsed.data)))
      },
    },
  })
}

/**
 * The store page's filters: the form, the filters the results follow (the
 * form's when valid, otherwise the URL's, so a half-typed price or an
 * upside-down range never empties the list) and the matching machines.
 * Registers `search_espresso_machines` over WebMCP while mounted: a visitor
 * agent's valid search lands on the filters as if picked by hand. The URL
 * follows valid filters, debounced, without the defaults.
 */
export function useStoreFilters({ search, save }: StoreUrl): StoreFilters {
  const form = useStoreForm(save, search)

  const pick = useCallback(
    (next: StoreFormValues) => {
      for (const name of Object.keys(next) as (keyof StoreFormValues)[]) {
        form.setFieldValue(name, next[name])
      }
    },
    [form],
  )
  useWebMcpTool(searchTool, {
    annotations: ANNOTATIONS,
    onResult: (result) => pick(agentSearchToForm(result)),
  })

  const values = useSelector(form.store, (state) => state.values)
  const parsed = storeFormSchema.safeParse(values)
  const committed = compactSearch(
    parsed.success ? formToSearch(parsed.data) : search,
  )

  const reset = () => {
    form.reset(EMPTY_FILTERS)
    save({})
  }

  return {
    form,
    search: committed,
    machines: searchMachines(searchToQuery(committed)),
    reset,
  }
}
