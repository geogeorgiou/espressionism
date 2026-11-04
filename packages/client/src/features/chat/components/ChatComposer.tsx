import { useSelector } from '@tanstack/react-form'
import { SendHorizontal } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useAppForm } from '@/features/common/form/form'

import {
  CHAT_DEFAULT_VALUES,
  CHAT_SUGGESTIONS,
  MAX_MESSAGE_LENGTH,
  chatMessageSchema,
} from '../constants'

interface ChatComposerProps {
  onSend: (text: string) => void
  /** Blocks sending while a reply is on its way; typing stays open. */
  busy: boolean
  /** Starter questions, shown until the conversation begins. */
  showSuggestions: boolean
}

export function ChatComposer({
  onSend,
  busy,
  showSuggestions,
}: ChatComposerProps) {
  const form = useAppForm({
    defaultValues: CHAT_DEFAULT_VALUES,
    validators: { onChange: chatMessageSchema },
    onSubmit: ({ value, formApi }) => {
      onSend(value.message)
      formApi.reset()
    },
  })
  const empty = useSelector(
    form.store,
    (state) => state.values.message.trim().length === 0,
  )

  return (
    <div className="flex flex-col gap-3 border-t-2 border-foreground px-5 py-4">
      {showSuggestions && (
        <ul aria-label="Suggested questions" className="flex flex-wrap gap-2">
          {CHAT_SUGGESTIONS.map((suggestion) => (
            <li key={suggestion}>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => onSend(suggestion)}
                className="font-normal"
              >
                {suggestion}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit()
        }}
        className="flex items-start gap-2"
      >
        <form.AppField name="message">
          {(field) => (
            <field.TextField
              label="Your question"
              hideLabel
              placeholder="Your budget, your taste, your call…"
              maxLength={MAX_MESSAGE_LENGTH}
              className="min-w-0 flex-1"
            />
          )}
        </form.AppField>
        <Button
          type="submit"
          disabled={busy || empty}
          className="border-2 border-foreground font-pixel"
        >
          <SendHorizontal aria-hidden />
          <span>Send</span>
        </Button>
      </form>
    </div>
  )
}
