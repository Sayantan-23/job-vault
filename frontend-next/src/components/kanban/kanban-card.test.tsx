import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { KanbanCard } from './kanban-card'
import type { KanbanCard as Card } from '@/types/dashboard'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/app/dashboard' }))

const CARD: Card = {
  id: 'j1', title: 'Staff Engineer', company: 'Acme', location: 'Remote',
  ghostDays: 3, status: 'APPLIED', kanbanOrder: 1, lastActivityAt: null, createdAt: '',
}

function renderCard(card: Card = CARD) {
  return render(
    <DndContext>
      <SortableContext items={[card.id]}>
        <KanbanCard card={card} />
      </SortableContext>
    </DndContext>,
  )
}

describe('KanbanCard', () => {
  it('shows the title, company and ghost meter', () => {
    renderCard()
    expect(screen.getByText('Staff Engineer')).toBeInTheDocument()
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByTestId('ghost-meter')).toBeInTheDocument()
  })

  it('navigates to the job query param on click', async () => {
    renderCard()
    await userEvent.click(screen.getByText('Staff Engineer'))
    expect(push).toHaveBeenCalledWith('/app/dashboard?job=j1')
  })
})
