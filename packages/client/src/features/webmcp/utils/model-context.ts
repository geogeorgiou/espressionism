import { useWebMcpStore } from '../stores/webmcp-store'

/** The browser's WebMCP entry point, if it has one (never during prerender). */
export function getModelContext(): WebMCP.ModelContext | undefined {
  return typeof document === 'undefined' ? undefined : document.modelContext
}

interface Registration {
  tool: WebMCP.ModelContextTool
  controller: AbortController
}

/**
 * Mirrors the store's tools to `document.modelContext`: registers new tools
 * and aborts the signal of removed or replaced ones (WebMCP has no
 * `unregisterTool`). Returns a cleanup that unregisters everything.
 */
export function startModelContextSync(): () => void {
  const modelContext = getModelContext()
  useWebMcpStore.getState().setSupported(modelContext !== undefined)
  if (!modelContext) return () => {}

  const registrations = new Map<string, Registration>()

  const sync = (tools: Record<string, WebMCP.ModelContextTool>) => {
    for (const [name, registration] of registrations) {
      if (tools[name] === registration.tool) continue
      registration.controller.abort()
      registrations.delete(name)
    }
    for (const tool of Object.values(tools)) {
      if (registrations.has(tool.name)) continue
      const controller = new AbortController()
      registrations.set(tool.name, { tool, controller })
      modelContext
        .registerTool(tool, { signal: controller.signal })
        .catch((error: unknown) => {
          console.warn(`WebMCP: couldn't register "${tool.name}"`, error)
        })
    }
  }

  sync(useWebMcpStore.getState().tools)
  const unsubscribe = useWebMcpStore.subscribe((state, previous) => {
    if (state.tools !== previous.tools) sync(state.tools)
  })

  return () => {
    unsubscribe()
    for (const { controller } of registrations.values()) controller.abort()
    registrations.clear()
  }
}
