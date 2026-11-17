import type { AnyToolDef, ToolContext, ToolOutput } from '@espressionism/tool'
import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'

import type { WebMcpStatus } from '../stores/webmcp-store'
import { useWebMcpStore } from '../stores/webmcp-store'
import type { WebMcpSummary } from '../utils/model-context'
import { getModelContext, summarizeStatuses } from '../utils/model-context'

/**
 * The live registration per tool name. A newer mount of the same tool
 * (Strict Mode's second effect run, HMR) aborts the older one first, so the
 * browser never sees the name twice.
 */
const activeRegistrations = new Map<string, AbortController>()

type Success<D extends AnyToolDef> = Extract<ToolOutput<D>, { ok: true }>

export type WebMcpToolOptions<D extends AnyToolDef> = {
  /** Part of the tool's identity: keep it a module constant. */
  annotations?: WebMCP.ToolAnnotations
  /** After a successful call, before the agent gets the answer. */
  onResult?: (result: Success<D>) => void
} & (undefined extends ToolContext<D>
  ? { context?: () => ToolContext<D> }
  : {
      /** Read on every call, e.g. the form's current values. */
      context: () => ToolContext<D>
    })

/**
 * A tool definition (`defineTool`) as a WebMCP tool, registered while the
 * calling component is mounted. Every call runs `def.run` with the current
 * `context()`; a successful one goes to `onResult` (to update the page). The
 * agent gets `def.run`'s answer as it is, failures included. Returns the tool's status.
 */
export function useWebMcpTool<D extends AnyToolDef>(
  def: D,
  options: WebMcpToolOptions<D>,
): WebMcpStatus {
  const { annotations, onResult, context } = options as {
    annotations?: WebMCP.ToolAnnotations
    onResult?: (result: Success<D>) => void
    context?: () => unknown
  }
  const run = def.run as (raw: unknown, ctx?: unknown) => ToolOutput<D>
  return useModelContextTool({
    name: def.name,
    title: def.title,
    description: def.description,
    inputSchema: def.jsonSchema,
    annotations,
    execute: (input) => {
      const result = run(input, context?.())
      if (result.ok) onResult?.(result as Success<D>)
      return result
    },
  })
}

/**
 * Registers a WebMCP tool with `document.modelContext` while the calling
 * component is mounted, and returns its status. `useWebMcpTool` builds on
 * it; use this directly only for a tool without a definition. The status is also kept in
 * `useWebMcpStore`, so the banner (or anything else) can show it.
 *
 * `execute` may change every render (it's read through a ref). The rest of
 * the definition is the tool's identity: keep `inputSchema` and
 * `annotations` stable (module constants), since changing them re-registers.
 */
export function useModelContextTool(
  tool: WebMCP.ModelContextTool,
): WebMcpStatus {
  const executeRef = useRef(tool.execute)
  useEffect(() => {
    executeRef.current = tool.execute
  })

  const { name, title, description, inputSchema, annotations } = tool
  useEffect(() => {
    const { setStatus, clearStatus } = useWebMcpStore.getState()
    const modelContext = getModelContext()
    if (!modelContext) {
      setStatus(name, 'unavailable')
      return () => clearStatus(name)
    }

    activeRegistrations.get(name)?.abort()
    const controller = new AbortController()
    activeRegistrations.set(name, controller)
    setStatus(name, 'checking')

    modelContext
      .registerTool(
        {
          name,
          title,
          description,
          inputSchema,
          annotations,
          execute: (input, options) => executeRef.current(input, options),
        },
        { signal: controller.signal },
      )
      .then(() => {
        if (!controller.signal.aborted) setStatus(name, 'available')
      })
      .catch((error: unknown) => {
        // Aborting before the browser settles the registration rejects it
        // with the abort reason: that's us unregistering, not a failure.
        if (controller.signal.aborted) return
        console.warn(`WebMCP: couldn't register "${name}"`, error)
        setStatus(name, 'error')
      })

    return () => {
      controller.abort()
      if (activeRegistrations.get(name) === controller) {
        activeRegistrations.delete(name)
        clearStatus(name)
      }
    }
  }, [name, title, description, inputSchema, annotations])

  return useWebMcpStore((state) => state.statuses[name] ?? 'checking')
}

/** The page-wide WebMCP status, summed up over every registered tool. */
export function useWebMcpSummary(): WebMcpSummary {
  const statuses = useWebMcpStore(
    useShallow((state) => Object.values(state.statuses)),
  )
  return summarizeStatuses(statuses)
}
