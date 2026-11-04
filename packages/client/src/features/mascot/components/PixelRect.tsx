interface PixelRectProps {
  pixel: { x: number; y: number; fill: string; opacity: number }
}

/** One sprite pixel as a 1×1 SVG rect. */
export function PixelRect({ pixel }: PixelRectProps) {
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
