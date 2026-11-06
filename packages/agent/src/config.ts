import { createGoogle } from '@ai-sdk/google'

import type { AgentConfig } from './handler'
import { createStoreReply } from './reply'

/** Cheap, stable and tool-capable; override with `GEMINI_MODEL`. */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite'

/** The variables the agent reads. Hosts pass their own env in. */
export interface AgentEnv {
  /** Google AI Studio key. Server-side only: never a `VITE_` variable. */
  GOOGLE_GENERATIVE_AI_API_KEY?: string
  GEMINI_MODEL?: string
}

/**
 * Builds the agent's config from a host's environment. With no key the chat
 * keeps the placeholder reply, so tests, CI and keyless previews still work.
 * The agent never reads `process.env` itself: Vercel passes `process.env`,
 * the Vite dev server passes what `loadEnv` read.
 */
export function agentConfigFromEnv(env: AgentEnv): AgentConfig {
  const apiKey = env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
  if (!apiKey) return {}
  const google = createGoogle({ apiKey })
  const modelId = env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL
  return { reply: createStoreReply({ model: google(modelId) }) }
}
