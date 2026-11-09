import { clsx } from 'clsx'

import { useMemorySnapshot } from '../hooks/use-memory-snapshot'

function minutes(ms: number): string {
  return ms < 60_000
    ? `${Math.round(ms / 1000)} s`
    : `${Math.round(ms / 60_000)} min`
}

/**
 * Dev-only look at Robospresso's memory: the sessions the server holds, in
 * LRU order (the first one is evicted next when the store is full). Sizes
 * only, never what was said.
 */
export function MemoryOverview() {
  const snapshot = useMemorySnapshot()

  return (
    <section
      aria-labelledby="memory-title"
      className="mt-6 rounded-lg border-2 border-dashed border-foreground bg-card px-5 py-4 text-card-foreground"
    >
      <h2 id="memory-title" className="font-pixel text-base">
        Memory (dev)
      </h2>
      {snapshot ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">
            {snapshot.sessions.length} of {snapshot.maxSessions} sessions · idle
            TTL {minutes(snapshot.ttlMs)} · up to {snapshot.maxTurns} turns
            each. Least recently used first.
          </p>
          {snapshot.sessions.length === 0 ? (
            <p className="mt-3 text-sm">
              No sessions yet: ask Robospresso something.
            </p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="font-pixel text-xs">
                  <tr>
                    <th className="py-1 pr-3">#</th>
                    <th className="py-1 pr-3">Session</th>
                    <th className="py-1 pr-3">Turns</th>
                    <th className="py-1 pr-3">Chars</th>
                    <th className="py-1 pr-3">Idle</th>
                    <th className="py-1">State</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.sessions.map((session, index) => (
                    <tr
                      key={session.id}
                      className={clsx(
                        'border-t border-border',
                        session.expired && 'text-muted-foreground line-through',
                      )}
                    >
                      <td className="py-1 pr-3">{index + 1}</td>
                      <td className="py-1 pr-3 font-mono" title={session.id}>
                        {session.id.slice(0, 8)}
                      </td>
                      <td className="py-1 pr-3">{session.turns}</td>
                      <td className="py-1 pr-3">{session.chars}</td>
                      <td className="py-1 pr-3">{minutes(session.idleMs)}</td>
                      <td className="py-1">
                        {session.expired
                          ? 'expired'
                          : index === 0
                            ? 'next to evict'
                            : 'live'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          Waiting for the dev server…
        </p>
      )}
    </section>
  )
}
