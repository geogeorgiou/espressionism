import { createFileRoute } from '@tanstack/react-router'

import { calculatorSearchSchema } from '@/features/calculator/constants'
import { CalculatorPage } from '@/features/calculator/pages/CalculatorPage'

export const Route = createFileRoute('/')({
  validateSearch: calculatorSearchSchema,
  component: CalculatorPage,
})
