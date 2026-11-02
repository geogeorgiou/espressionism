import type { WebMcpStatus } from '../stores/webmcp-store'

/** The browser's WebMCP entry point, if it has one (never during prerender). */
export function getModelContext(): WebMCP.ModelContext | undefined {
  return typeof document === 'undefined' ? undefined : document.modelContext
}

export interface WebMcpSummary {
  status: WebMcpStatus
  /** How many tools agents can call right now. */
  ready: number
}

/**
 * One status for the whole page: available if any tool is live, otherwise
 * the most telling problem. No tools yet reads as still checking.
 */
export function summarizeStatuses(statuses: WebMcpStatus[]): WebMcpSummary {
  const ready = statuses.filter((status) => status === 'available').length
  if (ready > 0) return { status: 'available', ready }
  if (statuses.includes('error')) return { status: 'error', ready }
  if (statuses.length === 0 || statuses.includes('checking')) {
    return { status: 'checking', ready }
  }
  return { status: 'unavailable', ready }
}
