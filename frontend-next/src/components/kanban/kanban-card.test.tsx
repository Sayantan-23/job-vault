import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DndContext } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'
import { KanbanCard } from './kanban-card'
import type { KanbanCard as Card } from '@/types/dashboard'

const { push } = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/app/jobs',
  useSearchParams: () => new URLSearchParams('view=board'),
}))

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
  beforeEach(() => vi.clearAllMocks())

  it('shows the title, company and ghost meter', () => {
    renderCard()
    expect(screen.getByText('Staff Engineer')).toBeInTheDocument()
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByTestId('ghost-meter')).toBeInTheDocument()
  })

  it('navigates to the job query param on click, preserving the view', async () => {
    renderCard()
    await userEvent.click(screen.getByText('Staff Engineer'))
    expect(push).toHaveBeenCalledWith('/app/jobs?view=board&job=j1')
  })

  it('does NOT navigate when the pointer moves past the threshold (a drag, not a tap)', () => {
    renderCard()
    const cardButton = screen.getByText('Staff Engineer').closest('button')
    if (!cardButton) throw new Error('card button not found')
    fireEvent.pointerDown(cardButton, { clientX: 0, clientY: 0 })
    fireEvent.pointerUp(cardButton, { clientX: 40, clientY: 0 })
    expect(push).not.toHaveBeenCalled()
  })
})
