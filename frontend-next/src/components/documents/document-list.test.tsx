// frontend-next/src/components/documents/document-list.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DocumentList, type DocumentRow } from './document-list'

const ROWS: DocumentRow[] = [
  {
    id: 'd1',
    title: 'Acme — cover letter',
    context: 'Acme · Staff Engineer',
    personaName: 'Backend persona',
    createdAt: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'd2',
    title: 'General résumé',
    context: 'General',
    personaName: '—',
    createdAt: '2026-05-28T10:00:00.000Z',
  },
]

function renderList(overrides: Partial<Parameters<typeof DocumentList>[0]> = {}) {
  const onSelect = vi.fn()
  const onDelete = vi.fn()
  render(
    <DocumentList
      rows={ROWS}
      selectedId={null}
      onSelect={onSelect}
      onDelete={onDelete}
      emptyText="No documents yet."
      aria-label="Cover letters"
      {...overrides}
    />,
  )
  return { onSelect, onDelete }
}

describe('DocumentList', () => {
  it('renders title, context, persona and short date columns for every row', () => {
    renderList()
    expect(screen.getByRole('list', { name: 'Cover letters' })).toBeInTheDocument()
    expect(screen.getByText('Acme — cover letter')).toBeInTheDocument()
    expect(screen.getByText('Acme · Staff Engineer')).toBeInTheDocument()
    expect(screen.getByText('Backend persona')).toBeInTheDocument()
    expect(screen.getByText(/Jun\s+1/)).toBeInTheDocument()
    expect(screen.getByText('General résumé')).toBeInTheDocument()
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText(/May\s+28/)).toBeInTheDocument()
  })

  it('clicking a row calls onSelect with its id', async () => {
    const { onSelect } = renderList()
    await userEvent.click(screen.getByRole('button', { name: /^Acme — cover letter/ }))
    expect(onSelect).toHaveBeenCalledWith('d1')
  })

  it('pressing Enter on a focused row calls onSelect with its id', async () => {
    const { onSelect } = renderList()
    const row = screen.getByRole('button', { name: /^General résumé/ })
    row.focus()
    await userEvent.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith('d2')
  })

  it('clicking delete calls onDelete with the id and does not select the row', async () => {
    const { onSelect, onDelete } = renderList()
    await userEvent.click(screen.getByRole('button', { name: 'Delete Acme — cover letter' }))
    expect(onDelete).toHaveBeenCalledWith('d1')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('pressing Enter on a focused delete button does not also select the row', async () => {
    const { onSelect, onDelete } = renderList()
    screen.getByRole('button', { name: 'Delete Acme — cover letter' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(onDelete).toHaveBeenCalledWith('d1')
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('marks only the selected row with aria-current', () => {
    renderList({ selectedId: 'd2' })
    expect(screen.getByRole('button', { name: /^General résumé/ })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByRole('button', { name: /^Acme — cover letter/ })).not.toHaveAttribute('aria-current')
  })

  it('branches the selected background instead of stacking hover on top of it', () => {
    renderList({ selectedId: 'd1' })
    const selected = screen.getByRole('button', { name: /^Acme — cover letter/ })
    const unselected = screen.getByRole('button', { name: /^General résumé/ })
    expect(selected.className).toMatch(/(?:^|\s)bg-accent(?:\s|$)/)
    expect(selected.className).not.toContain('hover:bg-accent/50')
    expect(unselected.className).toContain('hover:bg-accent/50')
    expect(unselected.className).not.toMatch(/(?:^|\s)bg-accent(?:\s|$)/)
  })

  it('gives keyboard-focused rows a visible ring', () => {
    renderList()
    const row = screen.getByRole('button', { name: /^Acme — cover letter/ })
    expect(row.className).toContain('focus-visible:ring-2')
    expect(row.className).toContain('focus-visible:ring-ring')
  })

  it('omits the persona segment when the row has no persona', () => {
    renderList()
    // d2 has personaName '—', so it should not render the dot-separated persona.
    const row = screen.getByRole('button', { name: /^General résumé/ })
    expect(row.textContent).not.toContain('—')
  })

  it('renders the empty text without any rows when rows is empty', () => {
    renderList({ rows: [] })
    expect(screen.getByText('No documents yet.')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
