interface FieldErrorProps {
  id: string
  errors: unknown[]
  show: boolean
}

/** First validation message for a field, from Zod (Standard Schema) issues or plain strings. */
export function firstErrorMessage(errors: unknown[]): string | undefined {
  for (const error of errors) {
    if (typeof error === 'string') return error
    if (error && typeof error === 'object' && 'message' in error) {
      const { message } = error
      if (typeof message === 'string') return message
    }
  }
  return undefined
}

export function FieldError({ id, errors, show }: FieldErrorProps) {
  const message = show ? firstErrorMessage(errors) : undefined
  if (!message) return null
  return (
    <p id={id} role="alert" className="text-sm font-semibold text-destructive">
      {message}
    </p>
  )
}
