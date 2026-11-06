import { createUIMessageStream } from 'ai'
import type { UIMessageChunk } from 'ai'

/** Robospresso's reply as UI message chunks, ready to stream to the browser. */
export type ReplyStream = ReadableStream<UIMessageChunk>

/** Said to the browser whenever an answer fails; the reason stays in the log. */
export const GENERIC_ERROR = 'Robospresso could not answer'

/** Logs an upstream error as `name: message` only: no bodies, no headers. */
export function logError(error: unknown): void {
  console.error(
    'Robospresso could not answer:',
    error instanceof Error ? `${error.name}: ${error.message}` : error,
  )
}

/** Writes one complete text part. */
export function writeText(
  writer: { write: (chunk: UIMessageChunk) => void },
  text: string,
  id = 'text-0',
): void {
  writer.write({ type: 'text-start', id })
  writer.write({ type: 'text-delta', id, delta: text })
  writer.write({ type: 'text-end', id })
}

/** A whole reply that is just one fixed text (the placeholder, tests). */
export function textReply(text: string): ReplyStream {
  return createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: 'start' })
      writeText(writer, text)
      writer.write({ type: 'finish' })
    },
  })
}
