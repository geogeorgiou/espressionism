/// <reference types="node" />
/**
 * Serves `@espressionism/agent` at `/api/*` from Vite, so `pnpm dev` and
 * `vp preview` behave like Vercel (where `api/chat.ts` does the same job).
 *
 * - dev: loads the agent's TypeScript source through Vite (no build needed;
 *   edits apply on the next request).
 * - preview (and the e2e tests): imports the built package, as Vercel does.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'

import type * as Agent from '@espressionism/agent'
import type { Connect, Plugin } from 'vite'

type ChatHandler = Agent.ChatHandler

const AGENT_SOURCE = fileURLToPath(
  new URL('../../agent/src/index.ts', import.meta.url),
)
// Kept in a variable so Vite doesn't try to bundle the built package while
// it loads this config (it doesn't exist until `vp pack` has run).
const AGENT_PACKAGE = '@espressionism/agent'

/** Routes under /api, mapped to the agent handler that serves each. */
const ROUTES = new Set(['/api/chat'])

export function agentApi(): Plugin {
  return {
    name: 'espressionism:agent-api',
    configureServer(server) {
      // One handler per loaded module, so state (the future listing cache)
      // survives between requests and resets when the agent source changes.
      const handlers = new WeakMap<object, ChatHandler>()
      server.middlewares.use(
        middleware(async () => {
          const agent = (await server.ssrLoadModule(
            AGENT_SOURCE,
          )) as typeof Agent
          let handler = handlers.get(agent)
          if (!handler) {
            handler = agent.createChatHandler()
            handlers.set(agent, handler)
          }
          return handler
        }),
      )
    },
    configurePreviewServer(server) {
      let handler: Promise<ChatHandler> | undefined
      server.middlewares.use(
        middleware(() => {
          handler ??= (import(AGENT_PACKAGE) as Promise<typeof Agent>).then(
            (agent) => agent.createChatHandler(),
          )
          return handler
        }),
      )
    },
  }
}

function middleware(
  load: () => Promise<ChatHandler>,
): Connect.NextHandleFunction {
  return (req, res, next) => {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname
    if (!path.startsWith('/api/')) return next()
    if (!ROUTES.has(path)) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Not found' }))
      return
    }
    load()
      .then(async (handler) => send(res, await handler(await toRequest(req))))
      .catch(next)
  }
}

/** Node request → Web Request (the body is small JSON, so it's buffered). */
async function toRequest(req: IncomingMessage): Promise<Request> {
  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item)
    } else if (value !== undefined) {
      headers.set(name, value)
    }
  }
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  return new Request(new URL(req.url ?? '/', `http://${req.headers.host}`), {
    method: req.method,
    headers,
    body: hasBody ? Buffer.concat(chunks) : undefined,
  })
}

/** Web Response → Node response. */
async function send(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, name) => res.setHeader(name, value))
  res.end(Buffer.from(await response.arrayBuffer()))
}
