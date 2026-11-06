import { createFileRoute } from '@tanstack/react-router'

import { storeSearchSchema } from '@/features/store/constants'
import { StorePage } from '@/features/store/pages/StorePage'

export const Route = createFileRoute('/store')({
  validateSearch: storeSearchSchema,
  component: StorePage,
})
