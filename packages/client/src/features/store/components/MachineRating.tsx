import { Star } from 'lucide-react'

import { formatRating } from '../utils/format'

/** "★ 4.7 / 5", or "No ratings yet". */
export function MachineRating({ rating }: { rating: number | null }) {
  const text = formatRating(rating)
  if (text === null) {
    return <p className="text-sm text-muted-foreground">No ratings yet</p>
  }
  return (
    <p className="flex items-center gap-1.5 font-semibold">
      <Star aria-hidden className="size-4 fill-crema text-brew" />
      <span>
        {text} <span className="text-muted-foreground">/ 5</span>
      </span>
    </p>
  )
}
