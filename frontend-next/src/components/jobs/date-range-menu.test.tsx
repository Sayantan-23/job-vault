import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DateRangeMenu } from './date-range-menu'

describe('DateRangeMenu', () => {
  it('applies the chosen From/To range', () => {
    const onApply = vi.fn()
    render(<DateRangeMenu onApply={onApply} />)
    fireEvent.change(screen.getByLabelText(/from/i), { target: { value: '2022-01-01' } })
    fireEvent.change(screen.getByLabelText(/to/i), { target: { value: '2022-12-31' } })
    fireEvent.click(screen.getByRole('button', { name: /apply/i }))
    expect(onApply).toHaveBeenCalledWith('2022-01-01', '2022-12-31')
  })
  it('clears to undefined', () => {
    const onApply = vi.fn()
    render(<DateRangeMenu from="2022-01-01" to="2022-12-31" onApply={onApply} />)
    fireEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(onApply).toHaveBeenCalledWith(undefined, undefined)
  })
})
