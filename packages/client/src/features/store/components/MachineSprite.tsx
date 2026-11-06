import { clsx } from 'clsx'
import { useMemo } from 'react'

import { PixelRect } from '@/features/mascot/components/PixelRect'
import { GRID_SIZE } from '@/features/mascot/utils/sprite'

import { buildMachineSprite } from '../utils/machine-sprite'

interface MachineSpriteProps {
  slug: string
  /** Size comes from Tailwind classes, e.g. `size-24`. */
  className?: string
}

/** A product's pixel picture. Decorative: the card carries the name. */
export function MachineSprite({ slug, className }: MachineSpriteProps) {
  const pixels = useMemo(() => buildMachineSprite(slug), [slug])
  return (
    <svg
      viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
      shapeRendering="crispEdges"
      className={clsx('block', className)}
      aria-hidden
    >
      {pixels.map((p) => (
        <PixelRect key={`${p.x}-${p.y}`} pixel={p} />
      ))}
    </svg>
  )
}
