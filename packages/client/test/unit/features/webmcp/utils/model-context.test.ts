import { describe, expect, it } from 'vite-plus/test'

import { summarizeStatuses } from '@/features/webmcp/utils/model-context'

describe('summarizeStatuses', () => {
  it('reads as checking before any tool reports', () => {
    expect(summarizeStatuses([])).toEqual({ status: 'checking', ready: 0 })
  })

  it('is available as soon as one tool is live, and counts them', () => {
    expect(summarizeStatuses(['available', 'error', 'available'])).toEqual({
      status: 'available',
      ready: 2,
    })
  })

  it('surfaces an error over checking', () => {
    expect(summarizeStatuses(['checking', 'error'])).toEqual({
      status: 'error',
      ready: 0,
    })
  })

  it('waits on tools still registering', () => {
    expect(summarizeStatuses(['checking'])).toEqual({
      status: 'checking',
      ready: 0,
    })
  })

  it('is unavailable when the browser has no WebMCP', () => {
    expect(summarizeStatuses(['unavailable'])).toEqual({
      status: 'unavailable',
      ready: 0,
    })
  })
})
