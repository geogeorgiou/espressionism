import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { WebMcpBanner } from '@/features/webmcp/components/WebMcpBanner'
import { useWebMcpStore } from '@/features/webmcp/stores/webmcp-store'

import { resetWebMcpStore } from '../model-context'

function banner() {
  return screen.getByRole('complementary', { name: 'WebMCP' })
}

describe('WebMcpBanner', () => {
  afterEach(() => {
    resetWebMcpStore()
  })

  it('says it is checking before any tool reports', () => {
    render(<WebMcpBanner />)
    expect(banner().textContent).toContain('Checking for WebMCP')
    expect(banner().getAttribute('data-status')).toBe('checking')
  })

  it('links to the Chrome docs when WebMCP is off', () => {
    useWebMcpStore.getState().setStatus('fill_calculator', 'unavailable')
    render(<WebMcpBanner />)
    expect(banner().textContent).toContain('Supports WebMCP')
    const link = screen.getByRole('link', { name: 'how to enable' })
    expect(link.getAttribute('href')).toBe(
      'https://developer.chrome.com/docs/ai/webmcp',
    )
  })

  it('counts the tools ready for an agent', () => {
    useWebMcpStore.getState().setStatus('fill_calculator', 'checking')
    render(<WebMcpBanner />)
    expect(banner().textContent).toContain('Checking for WebMCP')

    act(() =>
      useWebMcpStore.getState().setStatus('fill_calculator', 'available'),
    )
    expect(banner().textContent).toContain('WebMCP on: 1 tool ready')
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('flags a tool the browser refused', () => {
    useWebMcpStore.getState().setStatus('fill_calculator', 'error')
    render(<WebMcpBanner />)
    expect(banner().textContent).toContain("a tool couldn't register")
    expect(banner().getAttribute('data-status')).toBe('error')
  })
})
