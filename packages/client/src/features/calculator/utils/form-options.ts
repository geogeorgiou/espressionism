import { formOptions } from '@tanstack/react-form'

import { DEFAULT_INPUTS, calculatorSchema } from '../constants'

/** Shared by `useAppForm` on the page and `withForm` in CalculatorForm. */
export const calculatorFormOptions = formOptions({
  defaultValues: DEFAULT_INPUTS,
  validators: {
    onChange: calculatorSchema,
  },
})
