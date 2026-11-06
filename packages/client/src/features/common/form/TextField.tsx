import { clsx } from 'clsx'
import { useId } from 'react'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { FieldError } from './FieldError'
import { useFieldContext } from './form-context'

interface TextFieldProps {
  label: string
  /** Keep the label for screen readers only, e.g. in a chat composer. */
  hideLabel?: boolean
  placeholder?: string
  maxLength?: number
  className?: string
}

export function TextField({
  label,
  hideLabel = false,
  placeholder,
  maxLength,
  className,
}: TextFieldProps) {
  const field = useFieldContext<string>()
  const id = useId()
  const errorId = `${id}-error`
  const { errors, isTouched } = field.state.meta
  const invalid = isTouched && errors.length > 0

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <Label htmlFor={id} className={clsx(hideLabel && 'sr-only')}>
        {label}
      </Label>
      <Input
        id={id}
        name={field.name}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        maxLength={maxLength}
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
      />
      <FieldError id={errorId} errors={errors} show={isTouched} />
    </div>
  )
}
