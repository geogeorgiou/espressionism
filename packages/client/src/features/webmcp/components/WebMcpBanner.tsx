import { useWebMcpSummary } from '../hooks/use-webmcp-tool'
import type { WebMcpSummary } from '../utils/model-context'

export const WEBMCP_DOCS_URL = 'https://developer.chrome.com/docs/ai/webmcp'

function StatusText({ status, ready }: WebMcpSummary) {
  switch (status) {
    case 'available':
      return (
        <span>
          WebMCP on: {ready} {ready === 1 ? 'tool' : 'tools'} ready for your
          agent
        </span>
      )
    case 'error':
      return (
        <span>
          WebMCP is on, but a tool couldn't register. See the console.
        </span>
      )
    case 'unavailable':
      return (
        <span>
          Supports WebMCP —{' '}
          <a
            href={WEBMCP_DOCS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-11 items-center font-semibold text-screen-foreground underline underline-offset-4 hover:text-crema"
          >
            how to enable
          </a>
        </span>
      )
    case 'checking':
      return <span>Checking for WebMCP…</span>
  }
}

/** Thin strip above the header: the page's WebMCP status for agents. */
export function WebMcpBanner() {
  const summary = useWebMcpSummary()

  return (
    <aside
      aria-label="WebMCP"
      data-status={summary.status}
      className="bg-screen text-screen-foreground"
    >
      <output className="mx-auto flex min-h-11 w-full max-w-6xl flex-wrap items-center gap-x-3 px-4 text-sm sm:px-6">
        <span className="font-pixel text-xs tracking-wide text-crema uppercase">
          WebMCP
        </span>
        <StatusText {...summary} />
      </output>
    </aside>
  )
}
