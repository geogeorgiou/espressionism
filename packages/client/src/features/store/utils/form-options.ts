import { formOptions } from '@tanstack/react-form'

import { EMPTY_FILTERS, storeFormSchema } from '../constants'

/** Shared by `useAppForm` on the page and `withForm` in StoreFilters. */
export const storeFormOptions = formOptions({
  defaultValues: EMPTY_FILTERS,
  validators: {
    onChange: storeFormSchema,
  },
})
