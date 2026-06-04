import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { JobsToolbar } from './jobs-toolbar'
import { DEFAULT_FILTERS } from '@/types/filters'

const noop = vi.fn()
const handlers = { onSearch: noop, onStatus: noop, onGhost: noop, onSort: noop, onReset: noop }

describe('JobsToolbar', () => {
  it('list view shows search, status, ghost, and sort', () => {
    render(<JobsToolbar view="list" filters={DEFAULT_FILTERS} isFiltered={false} {...handlers} />)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/filter by activity/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument()
  })

  it('board view shows search + ghost only (no status, no sort)', () => {
    render(<JobsToolbar view="board" filters={DEFAULT_FILTERS} isFiltered={false} {...handlers} />)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByLabelText(/filter by activity/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/filter by status/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/sort by/i)).not.toBeInTheDocument()
  })

  it('shows Reset only when filtered and calls onReset', () => {
    const onReset = vi.fn()
    const { rerender } = render(
      <JobsToolbar view="list" filters={DEFAULT_FILTERS} isFiltered={false} {...handlers} onReset={onReset} />,
    )
    expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
    rerender(
      <JobsToolbar view="list" filters={{ ...DEFAULT_FILTERS, status: 'APPLIED' }} isFiltered {...handlers} onReset={onReset} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /reset/i }))
    expect(onReset).toHaveBeenCalled()
  })
})
