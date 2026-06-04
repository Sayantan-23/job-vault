import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { JobsPagination } from './jobs-pagination'

describe('JobsPagination', () => {
  it('renders the range and pages on Next', () => {
    const onPage = vi.fn()
    render(<JobsPagination meta={{ total: 47, page: 1, limit: 20, totalPages: 3 }} onPage={onPage} />)
    expect(screen.getByText(/1\s*–\s*20 of 47/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onPage).toHaveBeenCalledWith(2)
  })

  it('disables Next on the last page and computes a partial final range', () => {
    render(<JobsPagination meta={{ total: 47, page: 3, limit: 20, totalPages: 3 }} onPage={vi.fn()} />)
    expect(screen.getByText(/41\s*–\s*47 of 47/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('renders nothing when there is a single page', () => {
    const { container } = render(<JobsPagination meta={{ total: 5, page: 1, limit: 20, totalPages: 1 }} onPage={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
