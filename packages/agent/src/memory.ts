/**
 * Robospresso's memory: the sessions the server remembers. The handler
 * reads and writes them through `ConversationStore`, so a durable backend
 * can replace the in-memory one without touching it.
 */
import type { ChatTurn } from './contract'

export interface ConversationStore {
  /** A new, empty session; returns its id. */
  create: () => string
  /** The session's turns, or undefined if unknown or expired. Counts as use. */
  get: (id: string) => ChatTurn[] | undefined
  /** Adds turns to the end of a session. Throws if the session isn't held. */
  append: (id: string, turns: ChatTurn[]) => void
  delete: (id: string) => void
}

/** One session as the dev overview shows it: no turn text, only sizes. */
export interface SessionSummary {
  id: string
  turns: number
  chars: number
  /** Time since the session was last used. */
  idleMs: number
  /** Past its TTL, waiting for the next lazy cleanup. */
  expired: boolean
}

/** The in-memory store's limits and sessions, least recently used first. */
export interface MemorySnapshot {
  ttlMs: number
  maxSessions: number
  maxTurns: number
  sessions: SessionSummary[]
}

/** The in-memory store, plus a read-only look inside for development. */
export interface InMemoryStore extends ConversationStore {
  /** Every session held, least recently used first. Not a use. */
  snapshot: () => MemorySnapshot
}

export interface InMemoryStoreOptions {
  /** How long an unused session lives. Default 30 minutes. */
  ttlMs?: number
  /** Most sessions held at once; the least recently used goes first. Default 500. */
  maxSessions?: number
  /** Most turns a session keeps; the oldest are dropped. Default 200. */
  maxTurns?: number
  now?: () => number
  randomId?: () => string
}

interface Session {
  turns: ChatTurn[]
  usedAt: number
}

/**
 * Sessions in a `Map`, least recently used first: every use deletes and
 * re-inserts the entry. Expired sessions are dropped lazily, never by a
 * timer (serverless instances freeze, and timers keep tests open).
 */
export function createInMemoryStore({
  ttlMs = 30 * 60 * 1000,
  maxSessions = 500,
  maxTurns = 200,
  now = Date.now,
  randomId = () => crypto.randomUUID(),
}: InMemoryStoreOptions = {}): InMemoryStore {
  const sessions = new Map<string, Session>()

  const expired = (session: Session) => now() - session.usedAt > ttlMs

  /** The live session, marked as just used; drops it if it expired. */
  function use(id: string): Session | undefined {
    const session = sessions.get(id)
    if (!session) return undefined
    sessions.delete(id)
    if (expired(session)) return undefined
    session.usedAt = now()
    sessions.set(id, session)
    return session
  }

  /** Drops expired sessions; they sit at the front, oldest use first. */
  function sweep() {
    for (const [id, session] of sessions) {
      if (!expired(session)) return
      sessions.delete(id)
    }
  }

  return {
    create() {
      sweep()
      for (const oldest of sessions.keys()) {
        if (sessions.size < maxSessions) break
        sessions.delete(oldest)
      }
      const id = randomId()
      sessions.set(id, { turns: [], usedAt: now() })
      return id
    },
    get(id) {
      const session = use(id)
      return session && [...session.turns]
    },
    append(id, turns) {
      const session = use(id)
      if (!session) throw new Error('Unknown or expired session')
      session.turns = [...session.turns, ...turns].slice(-maxTurns)
    },
    delete(id) {
      sessions.delete(id)
    },
    snapshot() {
      return {
        ttlMs,
        maxSessions,
        maxTurns,
        sessions: [...sessions].map(([id, session]) => ({
          id,
          turns: session.turns.length,
          chars: session.turns.reduce((sum, turn) => sum + turn.text.length, 0),
          idleMs: now() - session.usedAt,
          expired: expired(session),
        })),
      }
    },
  }
}

export interface WindowBudget {
  maxTurns: number
  maxChars: number
}

/**
 * The window: the latest question plus the newest turns before it that fit
 * the budget, starting on a user turn so the model never reads an answer
 * without its question. The latest question is always kept, even over budget.
 */
export function selectWindow(
  turns: ChatTurn[],
  { maxTurns, maxChars }: WindowBudget = { maxTurns: 40, maxChars: 24_000 },
): ChatTurn[] {
  const last = turns.findLastIndex((turn) => turn.role === 'user')
  if (last === -1) return []
  let start = last
  let chars = turns[last].text.length
  while (start > 0) {
    const turn = turns[start - 1]
    if (last - start + 2 > maxTurns || chars + turn.text.length > maxChars) {
      break
    }
    start -= 1
    chars += turn.text.length
  }
  while (turns[start].role !== 'user') start += 1
  return turns.slice(start, last + 1)
}
