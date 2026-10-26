import { clsx } from 'clsx'
import { useId, useState } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { FieldError } from './FieldError'
import { useFieldContext } from './form-context'
import { parseDecimal } from './parse-decimal'

interface NumberFieldProps {
  label: string
  hint?: string
  /** Shown inside the input on the left, e.g. a currency symbol. */
  prefix?: string
  /** Shown inside the input on the right, e.g. "cups". */
  suffix?: string
  /** Whole numbers only: switches the mobile keyboard to digits. */
  integer?: boolean
}

export function NumberField({
  label,
  hint,
  prefix,
  suffix,
  integer = false,
}: NumberFieldProps) {
  const field = useFieldContext<number>()
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const { errors, isTouched } = field.state.meta
  const invalid = isTouched && errors.length > 0
  // A text input keeps what the user typed ("4," or "4.") while the form holds
  // the parsed number. type="number" can't: it drops the separator mid-entry
  // and rejects commas on mobile keyboards.
  const [text, setText] = useState(() => formatNumber(field.state.value))
  // Resync when the value changes from outside (reset, URL), not from typing.
  if (!Object.is(parseDecimal(text), field.state.value)) {
    setText(formatNumber(field.state.value))
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-semibold text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          id={id}
          name={field.name}
          type="text"
          inputMode={integer ? 'numeric' : 'decimal'}
          autoComplete="off"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            field.handleChange(parseDecimal(e.target.value))
          }}
          onBlur={field.handleBlur}
          aria-invalid={invalid || undefined}
          aria-describedby={
            clsx(hint && hintId, invalid && errorId) || undefined
          }
          className={clsx(prefix && 'pl-8', suffix && 'pr-16')}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      <FieldError id={errorId} errors={errors} show={isTouched} />
    </div>
  )
}

function formatNumber(value: number): string {
  return Number.isNaN(value) ? '' : String(value)
}
