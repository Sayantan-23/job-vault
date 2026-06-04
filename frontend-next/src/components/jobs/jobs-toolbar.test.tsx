import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { JobsToolbar } from './jobs-toolbar'
import { DEFAULT_FILTERS } from '@/types/filters'

const handlers = { onSearch: vi.fn(), onGhost: vi.fn(), onReset: vi.fn() }

describe('JobsToolbar', () => {
  it('renders only search + activity (no status select, no sort control)', () => {
    render(<JobsToolbar filters={DEFAULT_FILTERS} showReset={false} {...handlers} />)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByLabelText(/filter by activity/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/filter by status/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/sort by/i)).not.toBeInTheDocument()
  })
  it('shows Clear all only when showReset and calls onReset', () => {
    const onReset = vi.fn()
    const { rerender } = render(<JobsToolbar filters={DEFAULT_FILTERS} showReset={false} {...handlers} onReset={onReset} />)
    expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument()
    rerender(<JobsToolbar filters={DEFAULT_FILTERS} showReset {...handlers} onReset={onReset} />)
    fireEvent.click(screen.getByRole('button', { name: /clear all/i }))
    expect(onReset).toHaveBeenCalled()
  })
})
