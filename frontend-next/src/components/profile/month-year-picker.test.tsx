// frontend-next/src/components/profile/month-year-picker.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MonthYearPicker } from './month-year-picker'

describe('MonthYearPicker', () => {
  it('renders empty selects for a null value', () => {
    render(<MonthYearPicker value={null} onChange={vi.fn()} ariaPrefix="Start" />)
    expect((screen.getByLabelText('Start year') as HTMLSelectElement).value).toBe('')
  })
  it('emits a value with year when a year is chosen', async () => {
    const onChange = vi.fn()
    render(<MonthYearPicker value={null} onChange={onChange} ariaPrefix="Start" />)
    await userEvent.selectOptions(screen.getByLabelText('Start year'), '2022')
    expect(onChange).toHaveBeenCalledWith({ month: null, year: 2022 })
  })
  it('emits null when the year is cleared', async () => {
    const onChange = vi.fn()
    render(<MonthYearPicker value={{ month: 3, year: 2022 }} onChange={onChange} ariaPrefix="Start" />)
    await userEvent.selectOptions(screen.getByLabelText('Start year'), '')
    expect(onChange).toHaveBeenCalledWith(null)
  })
  it('updates the month while keeping the year', async () => {
    const onChange = vi.fn()
    render(<MonthYearPicker value={{ month: null, year: 2022 }} onChange={onChange} ariaPrefix="Start" />)
    await userEvent.selectOptions(screen.getByLabelText('Start month'), '5')
    expect(onChange).toHaveBeenCalledWith({ month: 5, year: 2022 })
  })
})
