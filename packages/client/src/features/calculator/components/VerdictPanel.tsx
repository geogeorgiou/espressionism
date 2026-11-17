import type { Analysis, Verdict } from '@espressionism/calculator'
import { clsx } from 'clsx'

import { Bitspresso } from '@/features/mascot/components/Bitspresso'
import type { MascotFlavor, MascotMood } from '@/features/mascot/utils/sprite'
import { captionInset } from '@/features/mascot/utils/sprite'

interface VerdictPanelProps {
  analysis: Analysis
  flavor: MascotFlavor
  /** How many fills an agent has put on the form; 0 if none yet. */
  agentFills?: number
}

const MOODS: Record<Verdict, { mug: MascotMood; togo: MascotMood }> = {
  fast: { mug: 'surprised', togo: 'sleepy' },
  solid: { mug: 'happy', togo: 'idle' },
  slow: { mug: 'idle', togo: 'wink' },
  'cafe-wins': { mug: 'sleepy', togo: 'happy' },
}

export function VerdictPanel({
  analysis,
  flavor,
  agentFills = 0,
}: VerdictPanelProps) {
  const { verdict, copy } = analysis
  const moods = MOODS[verdict]
  // Each agent fill remounts the mascots (key) so the one-shot hop replays.
  const mascotClass = clsx(
    'size-28 group-hover:animate-hop motion-reduce:group-hover:animate-none sm:size-36',
    agentFills > 0 && 'animate-hop motion-reduce:animate-none',
  )

  return (
    <section
      aria-labelledby="verdict-title"
      aria-live="polite"
      className="flex flex-col gap-5 rounded-lg border-4 border-foreground bg-screen p-5 text-screen-foreground shadow-pixel-lg"
    >
      {agentFills > 0 && (
        <p className="self-center bg-screen-foreground px-2.5 py-1 font-pixel text-xs text-screen">
          Filled by your agent
        </p>
      )}
      <div className="flex items-end justify-center gap-4 sm:gap-8">
        <figure className="group flex flex-col items-center gap-2">
          <Bitspresso
            key={agentFills}
            form="togo"
            mood={moods.togo}
            flavor={flavor}
            className={mascotClass}
          />
          <figcaption
            className="self-stretch text-center font-pixel text-xs tracking-wide opacity-80"
            style={captionInset('togo')}
          >
            To go
          </figcaption>
        </figure>
        <span aria-hidden className="pb-10 font-pixel text-lg opacity-60">
          vs
        </span>
        <figure className="group flex flex-col items-center gap-2">
          <Bitspresso
            key={agentFills}
            form="mug"
            mood={moods.mug}
            flavor={flavor}
            className={mascotClass}
          />
          <figcaption
            className="self-stretch text-center font-pixel text-xs tracking-wide opacity-80"
            style={captionInset('mug')}
          >
            For here
          </figcaption>
        </figure>
      </div>
      <div className="flex flex-col gap-2 border-t-2 border-dashed border-screen-foreground/30 pt-4 text-center">
        <h2
          id="verdict-title"
          className="font-pixel text-xl leading-snug text-balance sm:text-2xl"
        >
          {copy.headline}
        </h2>
        <p className="text-base opacity-85">{copy.net}</p>
      </div>
    </section>
  )
}
