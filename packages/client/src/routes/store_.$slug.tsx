import { findMachine } from '@espressionism/store'
import { createFileRoute, notFound } from '@tanstack/react-router'

import { storeSearchSchema } from '@/features/store/constants'
import { MachineNotFound } from '@/features/store/pages/MachineNotFound'
import { MachinePage } from '@/features/store/pages/MachinePage'

// Not nested under /store: the product page replaces the grid. An unknown
// slug renders the not-found screen at the same URL.
export const Route = createFileRoute('/store_/$slug')({
  validateSearch: storeSearchSchema,
  loader: ({ params }) => {
    const machine = findMachine(params.slug)
    if (!machine) throw notFound()
    return machine
  },
  component: MachinePage,
  notFoundComponent: MachineNotFound,
})
