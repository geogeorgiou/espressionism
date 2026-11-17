import { create } from 'zustand'

/**
 * Where a tool's registration stands: still registering, live for agents,
 * the browser has no WebMCP, or the browser refused it.
 */
export type WebMcpStatus = 'checking' | 'available' | 'unavailable' | 'error'

/**
 * WebMCP state the whole app can read: each registered tool's status, set
 * by `useWebMcpTool`.
 */
interface WebMcpState {
  statuses: Record<string, WebMcpStatus>
  setStatus: (name: string, status: WebMcpStatus) => void
  clearStatus: (name: string) => void
}

export const useWebMcpStore = create<WebMcpState>()((set) => ({
  statuses: {},
  setStatus: (name, status) =>
    set((state) => ({ statuses: { ...state.statuses, [name]: status } })),
  clearStatus: (name) =>
    set((state) => {
      const { [name]: _cleared, ...statuses } = state.statuses
      return { statuses }
    }),
}))
