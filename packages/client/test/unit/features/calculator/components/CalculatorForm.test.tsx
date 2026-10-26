import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vite-plus/test'

import { CalculatorForm } from '@/features/calculator/components/CalculatorForm'
import { calculatorFormOptions } from '@/features/calculator/utils/form-options'
import { useAppForm } from '@/features/common/form/form'

function Harness() {
  const form = useAppForm(calculatorFormOptions)
  return <CalculatorForm form={form} />
}

describe('CalculatorForm', () => {
  it('shows the default habit', () => {
    render(<Harness />)
    const price = screen.getByLabelText<HTMLInputElement>('Price per drink')
    const days = screen.getByLabelText<HTMLInputElement>('Days a week')
    expect(price.valueAsNumber).toBe(3.5)
    expect(days.valueAsNumber).toBe(5)
  })

  it('flags a days-per-week value above seven', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const days = screen.getByLabelText('Days a week')
    await user.clear(days)
    await user.type(days, '9')
    await user.tab()
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toBe(
        'A week has seven days',
      ),
    )
    expect(days.getAttribute('aria-invalid')).toBe('true')
  })
})
