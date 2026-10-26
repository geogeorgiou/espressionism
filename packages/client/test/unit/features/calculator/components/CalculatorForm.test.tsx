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
    expect(price.value).toBe('3.5')
    expect(days.value).toBe('5')
  })

  it.each(['4.25', '4,25'])('accepts a decimal typed as %s', async (typed) => {
    const user = userEvent.setup()
    render(<Harness />)
    const price = screen.getByLabelText<HTMLInputElement>('Price per drink')
    await user.clear(price)
    await user.type(price, typed)
    expect(price.value).toBe(typed)
    await user.tab()
    expect(price.getAttribute('aria-invalid')).toBeNull()
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
