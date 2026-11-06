import { SEARCH_TOOL, searchToolInputSchema } from '@espressionism/store'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { z } from 'zod'

import { useStoreSearchTool } from '@/features/store/hooks/use-store-search-tool'
import { useWebMcpStore } from '@/features/webmcp/stores/webmcp-store'

import { resetWebMcpStore, stubModelContext } from '../../webmcp/model-context'

const signal = new AbortController().signal

async function registered(setFilters = vi.fn()) {
  const stub = stubModelContext()
  const { result } = renderHook(() => useStoreSearchTool({ setFilters }))
  await waitFor(() => expect(result.current).toBe('available'))
  const tool = stub.tools.get(SEARCH_TOOL.name)
  if (!tool) throw new Error('tool not registered')
  return { stub, tool, setFilters }
}

describe('useStoreSearchTool', () => {
  afterEach(() => {
    resetWebMcpStore()
    vi.restoreAllMocks()
  })

  it('registers the shared definition and JSON Schema', async () => {
    const { stub, tool } = await registered()
    try {
      expect(tool.description).toBe(SEARCH_TOOL.description)
      expect(tool.inputSchema).toEqual(z.toJSONSchema(searchToolInputSchema))
      expect(tool.annotations?.readOnlyHint).toBe(true)
    } finally {
      stub.restore()
    }
  })

  it('searches, shows the filters on the page and returns the result', async () => {
    const { stub, tool, setFilters } = await registered()
    try {
      const result = (await tool.execute(
        { maxPrice: 500, minRating: 4.2, sort: 'price_asc' },
        { signal },
      )) as { ok: boolean; items: { price: number; rating: number }[] }
      expect(result.ok).toBe(true)
      expect(result.items.every((m) => m.price <= 500 && m.rating >= 4.2)).toBe(
        true,
      )
      expect(setFilters).toHaveBeenCalledWith({
        minPrice: Number.NaN,
        maxPrice: 500,
        minRating: '4',
        sort: 'price_asc',
      })
      expect(
        useWebMcpStore.getState().invokedAt[SEARCH_TOOL.name],
      ).toBeDefined()
    } finally {
      stub.restore()
    }
  })

  it('returns the errors and leaves the page alone on bad input', async () => {
    const { stub, tool, setFilters } = await registered()
    try {
      const result = await tool.execute(
        { minPrice: 900, maxPrice: 100 },
        { signal },
      )
      expect(result).toEqual({
        ok: false,
        errors: [
          { field: 'maxPrice', message: 'minPrice must not exceed maxPrice' },
        ],
      })
      expect(setFilters).not.toHaveBeenCalled()
    } finally {
      stub.restore()
    }
  })
})
