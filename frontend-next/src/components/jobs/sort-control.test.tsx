import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SortControl } from './sort-control'

describe('SortControl', () => {
  it('calls onSort with the chosen field', () => {
    const onSort = vi.fn()
    render(<SortControl sortBy="createdAt" sortOrder="desc" onSort={onSort} />)
    fireEvent.change(screen.getByLabelText(/sort by/i), { target: { value: 'company' } })
    expect(onSort).toHaveBeenCalledWith('company')
  })

  it('toggles direction by calling onSort with the active field', () => {
    const onSort = vi.fn()
    render(<SortControl sortBy="company" sortOrder="asc" onSort={onSort} />)
    fireEvent.click(screen.getByRole('button', { name: /click to sort/i }))
    expect(onSort).toHaveBeenCalledWith('company')
  })
})
