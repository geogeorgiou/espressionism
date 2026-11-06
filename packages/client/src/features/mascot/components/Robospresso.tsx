import { clsx } from 'clsx'
import { useMemo } from 'react'

import type { RobotMood } from '@/features/mascot/utils/robot-sprite'
import { buildRobospresso } from '@/features/mascot/utils/robot-sprite'
import type { MascotFlavor } from '@/features/mascot/utils/sprite'
import { GRID_SIZE } from '@/features/mascot/utils/sprite'

import { PixelRect } from './PixelRect'

interface RobospressoProps {
  mood?: RobotMood
  flavor?: MascotFlavor
  /** Size comes from Tailwind classes, e.g. `size-14`. */
  className?: string
  /** Accessible name; pass an empty string when the mascot is decorative. */
  label?: string
  /**
   * While searching, sweeps the magnifying glass across the shades and
   * blinks the antenna light. Off by default.
   */
  animated?: boolean
}

export function Robospresso({
  mood = 'cool',
  flavor = 'house',
  className,
  label,
  animated = false,
}: RobospressoProps) {
  const { body, antenna, magnifier } = useMemo(() => {
    const pixels = buildRobospresso(mood, flavor)
    return {
      body: pixels.filter((p) => p.part === 'body'),
      antenna: pixels.filter((p) => p.part === 'antenna'),
      magnifier: pixels.filter((p) => p.part === 'magnifier'),
    }
  }, [mood, flavor])

  const name = label ?? `Robospresso, ${mood}`
  const decorative = name === ''
  const moving = animated && mood === 'searching'

  return (
    <svg
      viewBox={`0 0 ${GRID_SIZE} ${GRID_SIZE}`}
      shapeRendering="crispEdges"
      className={clsx('block overflow-visible', className)}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative ? true : undefined}
    >
      {body.map((p) => (
        <PixelRect key={`${p.x}-${p.y}`} pixel={p} />
      ))}
      <g
        data-part="antenna"
        className={clsx(moving && 'animate-blink motion-reduce:animate-none')}
      >
        {antenna.map((p) => (
          <PixelRect key={`${p.x}-${p.y}`} pixel={p} />
        ))}
      </g>
      {magnifier.length > 0 && (
        <g
          data-part="magnifier"
          className={clsx(moving && 'animate-scan motion-reduce:animate-none')}
        >
          {magnifier.map((p) => (
            <PixelRect key={`${p.x}-${p.y}`} pixel={p} />
          ))}
        </g>
      )}
    </svg>
  )
}
