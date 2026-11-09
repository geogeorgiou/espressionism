import type { CoffeeSummary, Verdict } from '@espressionism/calculator'
import { clsx } from 'clsx'

import { Bitspresso } from '@/features/mascot/components/Bitspresso'
import type { MascotFlavor, MascotMood } from '@/features/mascot/utils/sprite'
import { captionInset } from '@/features/mascot/utils/sprite'

import type { Currency } from '../utils/format'
import { formatDuration, formatMoney } from '../utils/format'

interface VerdictPanelProps {
  verdict: Verdict
  summary: CoffeeSummary
  years: number
  currency: Currency
  flavor: MascotFlavor
  /** When an agent last filled the form over WebMCP, or null if never. */
  agentFilledAt?: number | null
}

const MOODS: Record<Verdict, { mug: MascotMood; togo: MascotMood }> = {
  fast: { mug: 'surprised', togo: 'sleepy' },
  solid: { mug: 'happy', togo: 'idle' },
  slow: { mug: 'idle', togo: 'wink' },
  never: { mug: 'sleepy', togo: 'happy' },
}

function headline(verdict: Verdict, summary: CoffeeSummary, years: number) {
  if (verdict === 'never' || summary.breakEvenMonths === null) {
    return `The café wins over ${years} ${years === 1 ? 'year' : 'years'}.`
  }
  const when = formatDuration(summary.breakEvenMonths)
  if (verdict === 'fast') return `Paid off in just ${when}.`
  if (verdict === 'slow') return `Pays off in ${when}. Slowly.`
  return `Your machine pays for itself in ${when}.`
}

export function VerdictPanel({
  verdict,
  summary,
  years,
  currency,
  flavor,
  agentFilledAt = null,
}: VerdictPanelProps) {
  const moods = MOODS[verdict]
  // Each agent fill remounts the mascots (key) so the one-shot hop replays.
  const mascotClass = clsx(
    'size-28 group-hover:animate-hop motion-reduce:group-hover:animate-none sm:size-36',
    agentFilledAt !== null && 'animate-hop motion-reduce:animate-none',
  )
  const winsHome = summary.netSavings > 0
  const net = formatMoney(Math.abs(summary.netSavings), currency)

  return (
    <section
      aria-labelledby="verdict-title"
      aria-live="polite"
      className="flex flex-col gap-5 rounded-lg border-4 border-foreground bg-screen p-5 text-screen-foreground shadow-pixel-lg"
    >
      {agentFilledAt !== null && (
        <p className="self-center bg-screen-foreground px-2.5 py-1 font-pixel text-xs text-screen">
          Filled by your agent
        </p>
      )}
      <div className="flex items-end justify-center gap-4 sm:gap-8">
        <figure className="group flex flex-col items-center gap-2">
          <Bitspresso
            key={agentFilledAt}
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
            key={agentFilledAt}
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
          {headline(verdict, summary, years)}
        </h2>
        <p className="text-base opacity-85">
          {winsHome
            ? `Over ${years} ${years === 1 ? 'year' : 'years'} the machine leaves ${net} in your pocket.`
            : `Over ${years} ${years === 1 ? 'year' : 'years'} buying out costs ${net} less than the machine.`}
        </p>
      </div>
    </section>
  )
}
