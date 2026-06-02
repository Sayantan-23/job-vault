import { describe, it, expect } from 'vitest'
import { calculateKanbanOrder, findCard, moveCardToColumn } from './kanban'
import type { KanbanBoard, KanbanCard } from '@/types/dashboard'

function card(id: string, status: KanbanCard['status'], kanbanOrder: number): KanbanCard {
  return { id, title: id, company: 'C', location: null, ghostDays: 0, status, kanbanOrder, lastActivityAt: null, createdAt: '' }
}

function board(): KanbanBoard {
  return {
    columns: [
      { status: 'WISHLIST', jobs: [card('w1', 'WISHLIST', 1), card('w2', 'WISHLIST', 2)] },
      { status: 'APPLIED', jobs: [card('a1', 'APPLIED', 1)] },
      { status: 'INTERVIEWING', jobs: [] },
      { status: 'OFFER', jobs: [] },
      { status: 'REJECTED', jobs: [] },
      { status: 'ARCHIVED', jobs: [] },
    ],
    stats: { totalJobs: 3, byStatus: { WISHLIST: 2, APPLIED: 1, INTERVIEWING: 0, OFFER: 0, REJECTED: 0, ARCHIVED: 0 }, ghostAlerts: 0, recentActivity: 3 },
  }
}

describe('calculateKanbanOrder', () => {
  it('returns 1 for an empty column', () => {
    expect(calculateKanbanOrder([], 0)).toBe(1)
  })
  it('halves the first order when inserting at the top', () => {
    expect(calculateKanbanOrder([{ kanbanOrder: 4 }], 0)).toBe(2)
  })
  it('appends with last + 1', () => {
    expect(calculateKanbanOrder([{ kanbanOrder: 4 }], 1)).toBe(5)
  })
  it('uses the midpoint between neighbors', () => {
    expect(calculateKanbanOrder([{ kanbanOrder: 2 }, { kanbanOrder: 4 }], 1)).toBe(3)
  })
})

describe('findCard', () => {
  it('locates a card by id', () => {
    expect(findCard(board(), 'a1')).toEqual({ status: 'APPLIED', index: 0 })
  })
  it('returns null for an unknown id', () => {
    expect(findCard(board(), 'nope')).toBeNull()
  })
})

describe('moveCardToColumn', () => {
  it('moves a card to another column at an index and updates its status', () => {
    const next = moveCardToColumn(board(), 'w1', 'APPLIED', 0)
    const applied = next.columns.find((c) => c.status === 'APPLIED')
    const wishlist = next.columns.find((c) => c.status === 'WISHLIST')
    expect(applied?.jobs.map((j) => j.id)).toEqual(['w1', 'a1'])
    expect(applied?.jobs[0]?.status).toBe('APPLIED')
    expect(wishlist?.jobs.map((j) => j.id)).toEqual(['w2'])
  })
  it('reorders within the same column', () => {
    const next = moveCardToColumn(board(), 'w1', 'WISHLIST', 2)
    const wishlist = next.columns.find((c) => c.status === 'WISHLIST')
    expect(wishlist?.jobs.map((j) => j.id)).toEqual(['w2', 'w1'])
  })
  it('is a no-op for an unknown card', () => {
    const b = board()
    expect(moveCardToColumn(b, 'nope', 'APPLIED', 0)).toEqual(b)
  })
})
