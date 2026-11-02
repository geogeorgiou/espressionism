import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { WebMcpBanner } from '@/features/webmcp/components/WebMcpBanner'
import { useWebMcpStore } from '@/features/webmcp/stores/webmcp-store'

import { fakeTool, resetWebMcpStore } from '../model-context'

describe('WebMcpBanner', () => {
  afterEach(() => {
    resetWebMcpStore()
  })

  it('links to the Chrome docs when WebMCP is off', () => {
    render(<WebMcpBanner />)
    const banner = screen.getByRole('complementary', { name: 'WebMCP' })
    expect(banner.textContent).toContain('Supports WebMCP')
    const link = screen.getByRole('link', { name: 'how to enable' })
    expect(link.getAttribute('href')).toBe(
      'https://developer.chrome.com/docs/ai/webmcp',
    )
  })

  it('counts the tools ready for an agent when WebMCP is on', () => {
    useWebMcpStore.setState({ supported: true })
    render(<WebMcpBanner />)
    const banner = screen.getByRole('complementary', { name: 'WebMCP' })
    expect(banner.textContent).toContain('WebMCP on: 0 tools ready')

    act(() => useWebMcpStore.getState().addTool(fakeTool('fill_calculator')))
    expect(banner.textContent).toContain('WebMCP on: 1 tool ready')
    expect(screen.queryByRole('link')).toBeNull()
  })
})
