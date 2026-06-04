import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StatusFilterMenu } from './status-filter-menu'

describe('StatusFilterMenu', () => {
  it('renders All statuses + the 6 statuses and marks the active one', () => {
    render(<StatusFilterMenu value="APPLIED" onChange={vi.fn()} />)
    expect(screen.getByRole('option', { name: /all statuses/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /applied/i })).toHaveAttribute('aria-selected', 'true')
  })
  it('calls onChange with the chosen status, and undefined for All', () => {
    const onChange = vi.fn()
    render(<StatusFilterMenu value={undefined} onChange={onChange} />)
    fireEvent.click(screen.getByRole('option', { name: /^interviewing$/i }))
    expect(onChange).toHaveBeenCalledWith('INTERVIEWING')
    fireEvent.click(screen.getByRole('option', { name: /all statuses/i }))
    expect(onChange).toHaveBeenCalledWith(undefined)
  })
})
