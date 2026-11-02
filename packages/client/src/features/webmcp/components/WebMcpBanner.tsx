import { useWebMcpStore } from '../stores/webmcp-store'

export const WEBMCP_DOCS_URL = 'https://developer.chrome.com/docs/ai/webmcp'

/** Thin strip above the header: is WebMCP on, and how many tools are ready. */
export function WebMcpBanner() {
  const supported = useWebMcpStore((state) => state.supported)
  const toolCount = useWebMcpStore((state) => Object.keys(state.tools).length)

  return (
    <aside aria-label="WebMCP" className="bg-screen text-screen-foreground">
      <p className="mx-auto flex min-h-11 w-full max-w-6xl flex-wrap items-center gap-x-3 px-4 text-sm sm:px-6">
        <span className="font-pixel text-xs tracking-wide text-crema uppercase">
          WebMCP
        </span>
        {supported ? (
          <span>
            WebMCP on: {toolCount} {toolCount === 1 ? 'tool' : 'tools'} ready
            for your agent
          </span>
        ) : (
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
        )}
      </p>
    </aside>
  )
}
