import { createUIMessageStreamResponse } from 'ai'

import type { ChatError, ChatTurn } from './contract'
import { MAX_BODY_BYTES, chatRequestSchema } from './contract'
import { stubReply } from './persona'
import type { ReplyStream } from './stream'
import { GENERIC_ERROR, logError } from './stream'

export interface ReplyOptions {
  /** Aborts the answer when the visitor leaves or stops it. */
  signal?: AbortSignal
}

/** Streams Robospresso's next message from the conversation so far. */
export type ReplyFn = (
  messages: ChatTurn[],
  options?: ReplyOptions,
) => ReplyStream

export interface AgentConfig {
  /** Swappable brain; defaults to the placeholder reply. */
  reply?: ReplyFn
}

export type ChatHandler = (request: Request) => Promise<Response>

/**
 * The whole agent behind one Web-standard function. Hosts adapt to it in a
 * few lines: the Vercel Function (`api/chat.ts`) and the Vite dev plugin.
 * Create it once per process, not per request.
 *
 * A valid question gets an AI SDK UI message stream (server-sent events).
 * Errors before the stream starts are JSON (`{ error }`); errors during it
 * arrive as a generic error chunk. Either way the reason only reaches the
 * server log.
 */
export function createChatHandler({
  reply = stubReply,
}: AgentConfig = {}): ChatHandler {
  return async (request) => {
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, {
        Allow: 'POST',
      })
    }
    if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
      return json({ error: 'Request too large' }, 413)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return json({ error: 'Body must be JSON' }, 400)
    }
    // Turns are text only: anything else a client sends (tool parts, forged
    // tool outputs) is stripped here and never reaches the model.
    const parsed = chatRequestSchema.safeParse(body)
    if (!parsed.success) {
      return json({ error: 'Invalid chat request' }, 400)
    }

    try {
      const stream = reply(parsed.data.messages, { signal: request.signal })
      return createUIMessageStreamResponse({
        stream,
        headers: { 'Cache-Control': 'no-store' },
      })
    } catch (error) {
      logError(error)
      return json({ error: GENERIC_ERROR }, 500)
    }
  }
}

function json(
  data: ChatError,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}
