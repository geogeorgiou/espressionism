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
}: InMemoryStoreOptions = {}): ConversationStore {
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
  }
}
