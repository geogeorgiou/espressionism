import type { MemorySnapshot } from '@espressionism/agent'
import { useEffect, useState } from 'react'

/** Dev-only route served by `vite/agent-api.ts`. */
export const MEMORY_ENDPOINT = '/api/chat/memory'
const POLL_MS = 2000

/**
 * The agent's in-memory store as the dev server sees it, refreshed every
 * couple of seconds. `undefined` until the first answer, or if the route
 * isn't there (anything but `pnpm dev`).
 */
export function useMemorySnapshot(): MemorySnapshot | undefined {
  const [snapshot, setSnapshot] = useState<MemorySnapshot>()

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      try {
        const response = await fetch(MEMORY_ENDPOINT, {
          signal: controller.signal,
        })
        if (response.ok) setSnapshot((await response.json()) as MemorySnapshot)
      } catch {
        // The dev server is restarting, or the page is going away.
      }
    }
    void load()
    const timer = setInterval(() => void load(), POLL_MS)
    return () => {
      clearInterval(timer)
      controller.abort()
    }
  }, [])

  return snapshot
}
