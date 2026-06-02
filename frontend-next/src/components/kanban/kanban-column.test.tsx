import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DndContext } from '@dnd-kit/core'
import { KanbanColumn } from './kanban-column'
import type { KanbanColumn as Column } from '@/types/dashboard'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/app/dashboard' }))

const COLUMN: Column = {
  status: 'APPLIED',
  jobs: [
    { id: 'j1', title: 'Role A', company: 'Acme', location: null, ghostDays: 0, status: 'APPLIED', kanbanOrder: 1, lastActivityAt: null, createdAt: '' },
    { id: 'j2', title: 'Role B', company: 'Globex', location: null, ghostDays: 0, status: 'APPLIED', kanbanOrder: 2, lastActivityAt: null, createdAt: '' },
  ],
}

describe('KanbanColumn', () => {
  it('renders the status label, the mono count, and the cards', () => {
    render(
      <DndContext>
        <KanbanColumn column={COLUMN} />
      </DndContext>,
    )
    expect(screen.getByText('Applied')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Role A')).toBeInTheDocument()
    expect(screen.getByText('Role B')).toBeInTheDocument()
  })

  it('shows an empty hint when there are no cards', () => {
    render(
      <DndContext>
        <KanbanColumn column={{ status: 'OFFER', jobs: [] }} />
      </DndContext>,
    )
    expect(screen.getByText('Offer')).toBeInTheDocument()
    expect(screen.getByText(/no jobs/i)).toBeInTheDocument()
  })
})
