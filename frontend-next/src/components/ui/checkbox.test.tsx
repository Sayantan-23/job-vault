import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from './checkbox'

describe('Checkbox', () => {
  it('renders a checkbox associated with its aria-label and reflects checked', () => {
    render(<Checkbox aria-label="Agree" checked readOnly />)
    const box = screen.getByLabelText('Agree') as HTMLInputElement
    expect(box.type).toBe('checkbox')
    expect(box.checked).toBe(true)
  })

  it('fires onChange when toggled', async () => {
    const onChange = vi.fn()
    render(<Checkbox aria-label="Agree" onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('Agree'))
    expect(onChange).toHaveBeenCalled()
  })
})
