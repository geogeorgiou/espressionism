import { describe, expect, it } from 'vite-plus/test'

import { createInMemoryStore } from '../../src/memory'

describe('createInMemoryStore', () => {
  it('starts a session with no turns, and knows nothing of other ids', () => {
    const store = createInMemoryStore()
    const id = store.create()
    expect(store.get(id)).toEqual([])
    expect(store.get('no-such-session')).toBeUndefined()
  })

  it('keeps the turns appended to a session, in order', () => {
    const store = createInMemoryStore()
    const id = store.create()
    store.append(id, [{ role: 'user', text: 'Under €300?' }])
    store.append(id, [
      { role: 'assistant', text: 'Two machines fit.' },
      { role: 'user', text: 'The cheaper one?' },
    ])
    expect(store.get(id)).toEqual([
      { role: 'user', text: 'Under €300?' },
      { role: 'assistant', text: 'Two machines fit.' },
      { role: 'user', text: 'The cheaper one?' },
    ])
  })

  it('forgets a deleted session', () => {
    const store = createInMemoryStore()
    const id = store.create()
    store.append(id, [{ role: 'user', text: 'Hi' }])
    store.delete(id)
    expect(store.get(id)).toBeUndefined()
  })

  it('expires a session left idle past its TTL; reading it keeps it alive', () => {
    let now = 0
    const store = createInMemoryStore({ ttlMs: 1000, now: () => now })
    const idle = store.create()
    const busy = store.create()

    now = 900
    expect(store.get(busy)).toEqual([])
    now = 1500 // idle: 1500 ms since last use; busy: 600 ms
    expect(store.get(idle)).toBeUndefined()
    expect(store.get(busy)).toEqual([])
    now = 2600 // busy: 1100 ms since its last read
    expect(store.get(busy)).toBeUndefined()
  })

  it('makes room by evicting the least recently used session, not the oldest', () => {
    const store = createInMemoryStore({ maxSessions: 2 })
    const first = store.create()
    const second = store.create()
    store.get(first) // first is now the most recently used
    const third = store.create()
    expect(store.get(second)).toBeUndefined()
    expect(store.get(first)).toEqual([])
    expect(store.get(third)).toEqual([])
  })

  it('caps a session at maxTurns, dropping the oldest turns', () => {
    const store = createInMemoryStore({ maxTurns: 3 })
    const id = store.create()
    store.append(id, [
      { role: 'user', text: 'one' },
      { role: 'assistant', text: 'two' },
    ])
    store.append(id, [
      { role: 'user', text: 'three' },
      { role: 'assistant', text: 'four' },
    ])
    expect(store.get(id)?.map((turn) => turn.text)).toEqual([
      'two',
      'three',
      'four',
    ])
  })

  it('refuses to append to a session it does not hold', () => {
    const store = createInMemoryStore()
    expect(() =>
      store.append('no-such-session', [{ role: 'user', text: 'Hi' }]),
    ).toThrow('Unknown or expired session')
  })
})
