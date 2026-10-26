import { createFormHook } from '@tanstack/react-form'

import { fieldContext, formContext } from './form-context'
import { NumberField } from './NumberField'
import { SelectField } from './SelectField'

/**
 * App-wide TanStack Form hook. Field UI is registered once here, so forms use
 * `<form.AppField name="…">{(field) => <field.NumberField … />}</form.AppField>`.
 */
export const { useAppForm, withForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    NumberField,
    SelectField,
  },
  formComponents: {},
})
