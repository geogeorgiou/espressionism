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
import { loadEnv } from 'vite'

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
      const env = agentEnv(server.config.mode, server.config.envDir)
      // One handler per loaded module: created once, and recreated when the
      // agent source changes.
      const handlers = new WeakMap<object, ChatHandler>()
      server.middlewares.use(
        middleware(async () => {
          const agent = (await server.ssrLoadModule(
            AGENT_SOURCE,
          )) as typeof Agent
          let handler = handlers.get(agent)
          if (!handler) {
            handler = agent.createChatHandler(agent.agentConfigFromEnv(env))
            handlers.set(agent, handler)
          }
          return handler
        }),
      )
    },
    configurePreviewServer(server) {
      const env = agentEnv(server.config.mode, server.config.envDir)
      let handler: Promise<ChatHandler> | undefined
      server.middlewares.use(
        middleware(() => {
          handler ??= (import(AGENT_PACKAGE) as Promise<typeof Agent>).then(
            (agent) => agent.createChatHandler(agent.agentConfigFromEnv(env)),
          )
          return handler
        }),
      )
    },
  }
}

/**
 * True when the agent will answer with a model (an API key is set), false
 * when it falls back to the placeholder. Baked into the bundle as
 * `__CHAT_LIVE__`: a plain boolean, so the browser learns the mode, never
 * the key.
 */
export function isChatLive(mode: string, envDir: string): boolean {
  return Boolean(agentEnv(mode, envDir).GOOGLE_GENERATIVE_AI_API_KEY?.trim())
}

/**
 * The agent's variables from `.env` files (and the shell), read on the
 * server only. The empty prefix loads unprefixed names too; none of this
 * reaches the client bundle, which only sees `VITE_*` variables.
 */
function agentEnv(mode: string, envDir: string | false): Agent.AgentEnv {
  const env = loadEnv(mode, envDir || process.cwd(), '')
  return {
    GOOGLE_GENERATIVE_AI_API_KEY: env.GOOGLE_GENERATIVE_AI_API_KEY,
    GEMINI_MODEL: env.GEMINI_MODEL,
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
    // A visitor who closes the tab aborts the answer (and the model call).
    const closed = new AbortController()
    res.on('close', () => {
      if (!res.writableFinished) closed.abort()
    })
    load()
      .then(async (handler) =>
        send(res, await handler(await toRequest(req, closed.signal))),
      )
      .catch(next)
  }
}

/** Node request → Web Request (the body is small JSON, so it's buffered). */
async function toRequest(
  req: IncomingMessage,
  signal: AbortSignal,
): Promise<Request> {
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
    signal,
  })
}

/** Web Response → Node response, streamed chunk by chunk (answers are SSE). */
async function send(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, name) => res.setHeader(name, value))
  res.flushHeaders()
  if (response.body) {
    for await (const chunk of response.body) {
      if (res.destroyed) break
      res.write(chunk)
    }
  }
  res.end()
}
