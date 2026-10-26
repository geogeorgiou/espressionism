import { clsx } from 'clsx'
import { useMemo } from 'react'

import type {
  MascotFlavor,
  MascotForm,
  MascotMood,
  MascotPixel,
} from '@/features/mascot/utils/sprite'
import { GRID_SIZE, buildMascot } from '@/features/mascot/utils/sprite'

interface BitspressoProps {
  form?: MascotForm
  mood?: MascotMood
  flavor?: MascotFlavor
  /** Size comes from Tailwind classes, e.g. `size-40`. */
  className?: string
  /** Accessible name; pass an empty string when the mascot is decorative. */
  label?: string
  /**
   * Lets the steam (or the sleepy "Z") drift upwards and the scared sweat
   * drop drip. Off by default.
   */
  animated?: boolean
}

/** Seconds between wisps, so they rise one after another. */
const WISP_STAGGER = 0.7

function Pixel({ pixel }: { pixel: MascotPixel }) {
  return (
    <rect
      x={pixel.x}
      y={pixel.y}
      width={1}
      height={1}
      // Fills are CSS values (often `var(--mug-…)`), so they go through style.
      style={{ fill: pixel.fill }}
      opacity={pixel.opacity}
    />
  )
}

export function Bitspresso({
  form = 'mug',
  mood = 'idle',
  flavor = 'house',
  className,
  label,
  animated = false,
}: BitspressoProps) {
  const { body, wisps, z, sweat } = useMemo(() => {
    const pixels = buildMascot(form, mood, flavor)
    const grouped: MascotPixel[][] = []
    for (const p of pixels) {
      if (p.part === 'steam' && p.wisp !== undefined) {
        grouped[p.wisp] = [...(grouped[p.wisp] ?? []), p]
      }
    }
    return {
      body: pixels.filter((p) => p.part === 'body'),
      wisps: grouped,
      z: pixels.filter((p) => p.part === 'z'),
      sweat: pixels.filter((p) => p.part === 'sweat'),
    }
  }, [form, mood, flavor])

  const name =
    label ??
    `Bitspresso, ${flavor} ${form === 'togo' ? 'to-go cup' : 'mug'}, ${mood}`
  const decorative = name === ''
  // A scared mascot freezes: the steam stops drifting.
  const steamMoves = animated && mood !== 'scared'

  return (
    <svg
      viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
      shapeRendering="crispEdges"
      className={clsx('block overflow-visible', className)}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative ? true : undefined}
    >
      {wisps.map((wisp, i) => (
        <g
          key={`wisp-${wisp[0]?.x}-${wisp[0]?.y}`}
          data-part="steam"
          className={clsx(
            steamMoves && 'animate-steam motion-reduce:animate-none',
          )}
          style={
            steamMoves ? { animationDelay: `${i * WISP_STAGGER}s` } : undefined
          }
        >
          {wisp.map((p) => (
            <Pixel key={`${p.x}-${p.y}`} pixel={p} />
          ))}
        </g>
      ))}
      {z.length > 0 && (
        <g
          data-part="z"
          className={clsx(
            animated && 'animate-snooze motion-reduce:animate-none',
          )}
        >
          {z.map((p) => (
            <Pixel key={`${p.x}-${p.y}`} pixel={p} />
          ))}
        </g>
      )}
      {body.map((p) => (
        <Pixel key={`${p.x}-${p.y}`} pixel={p} />
      ))}
      {sweat.length > 0 && (
        <g
          data-part="sweat"
          className={clsx(
            animated && 'animate-sweat motion-reduce:animate-none',
          )}
        >
          {sweat.map((p) => (
            <Pixel key={`${p.x}-${p.y}`} pixel={p} />
          ))}
        </g>
      )}
    </svg>
  )
}
