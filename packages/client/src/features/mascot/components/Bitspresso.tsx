import { clsx } from 'clsx'
import { useMemo } from 'react'

import type {
  MascotFlavor,
  MascotForm,
  MascotMood,
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
}

export function Bitspresso({
  form = 'mug',
  mood = 'idle',
  flavor = 'house',
  className,
  label,
}: BitspressoProps) {
  const pixels = useMemo(
    () => buildMascot(form, mood, flavor),
    [form, mood, flavor],
  )
  const name =
    label ??
    `Bitspresso, ${flavor} ${form === 'togo' ? 'to-go cup' : 'mug'}, ${mood}`
  const decorative = name === ''

  return (
    <svg
      viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
      shapeRendering="crispEdges"
      className={clsx('block', className)}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative ? true : undefined}
    >
      {pixels.map((p) => (
        <rect
          key={`${p.x}-${p.y}`}
          x={p.x}
          y={p.y}
          width={1}
          height={1}
          fill={p.fill}
          opacity={p.opacity}
        />
      ))}
    </svg>
  )
}
