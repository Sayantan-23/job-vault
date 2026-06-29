import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DateRangeMenu } from './date-range-menu'

describe('DateRangeMenu', () => {
  it('reports a From change while preserving To', () => {
    const onChange = vi.fn()
    render(<DateRangeMenu to="2022-12-31" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/from/i), { target: { value: '2022-01-01' } })
    expect(onChange).toHaveBeenCalledWith('2022-01-01', '2022-12-31')
  })

  it('reports a To change while preserving From', () => {
    const onChange = vi.fn()
    render(<DateRangeMenu from="2022-01-01" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/to/i), { target: { value: '2022-12-31' } })
    expect(onChange).toHaveBeenCalledWith('2022-01-01', '2022-12-31')
  })

  it('clears a field to undefined', () => {
    const onChange = vi.fn()
    render(<DateRangeMenu from="2022-01-01" to="2022-12-31" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText(/from/i), { target: { value: '' } })
    expect(onChange).toHaveBeenCalledWith(undefined, '2022-12-31')
  })

  it('bounds the inputs so From cannot exceed To', () => {
    render(<DateRangeMenu from="2022-03-01" to="2022-09-01" onChange={vi.fn()} />)
    expect(screen.getByLabelText(/to/i)).toHaveAttribute('min', '2022-03-01')
    expect(screen.getByLabelText(/from/i)).toHaveAttribute('max', '2022-09-01')
  })
})
