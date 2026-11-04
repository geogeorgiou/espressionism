import { createChatHandler } from '@espressionism/agent'

// Created once per instance, so later caches survive between requests.
const handle = createChatHandler()

/**
 * Vercel Function: `POST /api/chat`. A thin adapter; everything else lives
 * in `@espressionism/agent`. Vercel answers other methods with 405.
 */
export function POST(request: Request): Promise<Response> {
  return handle(request)
}
