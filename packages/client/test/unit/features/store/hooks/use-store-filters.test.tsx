import { CATALOG, searchTool } from '@espressionism/store'
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { StoreFilters } from '@/features/store/components/StoreFilters'
import type { StoreSearch } from '@/features/store/constants'
import type { StoreUrl } from '@/features/store/hooks/use-store-filters'
import { useStoreFilters } from '@/features/store/hooks/use-store-filters'

import { resetWebMcpStore, stubModelContext } from '../../webmcp/model-context'

const signal = new AbortController().signal

/** A URL holding `search`, recording what the hook saves into it. */
function fakeUrl(search: StoreSearch = {}) {
  const save = vi.fn<StoreUrl['save']>()
  return { url: { search, save }, save }
}

/**
 * The hook over a URL that changes when saved, as the router's does, with
 * its filter form mounted: form listeners run through mounted fields.
 */
function mount(initial: StoreSearch = {}) {
  const save = vi.fn<StoreUrl['save']>()
  const { result } = renderHook(() => {
    const [search, setSearch] = useState(initial)
    return useStoreFilters({
      search,
      save: (next) => {
        save(next)
        setSearch(next)
      },
    })
  })
  render(
    <StoreFilters
      form={result.current.form}
      onReset={() => result.current.reset()}
    />,
  )
  return { result, save }
}

/** The hook with a fake WebMCP, and the search tool it registered. */
async function registered() {
  const stub = stubModelContext()
  const { result } = renderHook(() => useStoreFilters(fakeUrl().url))
  await waitFor(() => expect(stub.tools.has(searchTool.name)).toBe(true))
  const tool = stub.tools.get(searchTool.name)
  if (!tool) throw new Error('tool not registered')
  return { stub, tool, result }
}

describe('useStoreFilters', () => {
  afterEach(() => {
    resetWebMcpStore()
    vi.restoreAllMocks()
  })

  it('starts from the URL and lists what matches', () => {
    const { result } = renderHook(() =>
      useStoreFilters(fakeUrl({ maxPrice: 400, sort: 'price_asc' }).url),
    )
    expect(result.current.search).toEqual({ maxPrice: 400, sort: 'price_asc' })
    expect(result.current.machines.length).toBeGreaterThan(0)
    expect(result.current.machines.every((m) => m.price <= 400)).toBe(true)
  })

  it('ignores an upside-down range from a hand-edited URL', () => {
    const { result } = renderHook(() =>
      useStoreFilters(fakeUrl({ minPrice: 900, maxPrice: 100 }).url),
    )
    expect(result.current.machines).toHaveLength(CATALOG.length)
  })

  it('keeps the URL filters while the range is upside down, then saves', async () => {
    const user = userEvent.setup()
    const { result, save } = mount({ maxPrice: 400 })
    const min = screen.getByLabelText('Min price')

    await user.type(min, '500')
    expect(result.current.search).toEqual({ maxPrice: 400 })

    await user.clear(min)
    await user.type(min, '100')
    await waitFor(() =>
      expect(save).toHaveBeenLastCalledWith({ minPrice: 100, maxPrice: 400 }),
    )
    expect(result.current.search).toEqual({ minPrice: 100, maxPrice: 400 })
  })

  it('resets to every machine and clears the URL', () => {
    const { result, save } = mount({ maxPrice: 400 })
    act(() => result.current.reset())
    expect(save).toHaveBeenLastCalledWith({})
    expect(result.current.machines).toHaveLength(CATALOG.length)
  })

  describe('over WebMCP', () => {
    it('registers the shared definition and JSON Schema', async () => {
      const { stub, tool } = await registered()
      try {
        expect(tool.description).toBe(searchTool.description)
        expect(tool.inputSchema).toBe(searchTool.jsonSchema)
        expect(tool.annotations?.readOnlyHint).toBe(true)
      } finally {
        stub.restore()
      }
    })

    it('searches, shows the filters on the page and returns the result', async () => {
      const { stub, tool, result } = await registered()
      try {
        let answer: { ok: boolean; items: { price: number; rating: number }[] }
        await act(async () => {
          answer = (await tool.execute(
            { maxPrice: 500, minRating: 4.2, sort: 'price_asc' },
            { signal },
          )) as typeof answer
        })
        expect(answer!.ok).toBe(true)
        expect(
          answer!.items.every((m) => m.price <= 500 && m.rating >= 4.2),
        ).toBe(true)
        // 4.2 sits between the select's steps, so the page shows 4★ and up.
        expect(result.current.search).toEqual({
          maxPrice: 500,
          minRating: 4,
          sort: 'price_asc',
        })
      } finally {
        stub.restore()
      }
    })

    it('returns the errors and leaves the page alone on bad input', async () => {
      const { stub, tool, result } = await registered()
      try {
        const answer = await tool.execute(
          { minPrice: 900, maxPrice: 100 },
          { signal },
        )
        expect(answer).toEqual({
          ok: false,
          errors: [
            { field: 'maxPrice', message: 'minPrice must not exceed maxPrice' },
          ],
        })
        expect(result.current.search).toEqual({})
      } finally {
        stub.restore()
      }
    })
  })
})
