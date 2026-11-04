import type { ChatError, ChatReply, ChatTurn } from './contract'
import { MAX_BODY_BYTES, chatRequestSchema } from './contract'
import { stubReply } from './persona'

/** Produces Robospresso's next message from the conversation so far. */
export type ReplyFn = (messages: ChatTurn[]) => string | Promise<string>

export interface AgentConfig {
  /** Swappable brain; defaults to the placeholder reply. */
  reply?: ReplyFn
}

export type ChatHandler = (request: Request) => Promise<Response>

/**
 * The whole agent behind one Web-standard function. Hosts adapt to it in a
 * few lines: the Vercel Function (`api/chat.ts`) and the Vite dev plugin.
 * Create it once per process: later steps keep the listing cache in it.
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
    const parsed = chatRequestSchema.safeParse(body)
    if (!parsed.success) {
      return json({ error: 'Invalid chat request' }, 400)
    }

    try {
      const text = await reply(parsed.data.messages)
      return json({ message: { role: 'assistant', text } }, 200)
    } catch {
      // Never leak internals (stack traces, upstream errors) to the browser.
      return json({ error: 'Robospresso could not answer' }, 500)
    }
  }
}

function json(
  data: ChatReply | ChatError,
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
