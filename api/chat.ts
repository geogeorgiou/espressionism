import { agentConfigFromEnv, createChatHandler } from '@espressionism/agent'

// Created once per instance: the handler holds Robospresso's memory (the
// sessions), so it must outlive a request. Another instance, a cold start or
// a deploy forgets them, and the chat starts fresh with a note. The Gemini
// key comes from Vercel's environment (a Secret variable); without it the
// chat keeps its placeholder reply.
const handle = createChatHandler(agentConfigFromEnv(process.env))

/**
 * Vercel Function: `POST /api/chat`. A thin adapter; everything else lives
 * in `@espressionism/agent`. Vercel answers other methods with 405.
 */
export function POST(request: Request): Promise<Response> {
  return handle(request)
}
