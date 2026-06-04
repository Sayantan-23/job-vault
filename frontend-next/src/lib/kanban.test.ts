import { describe, it, expect } from 'vitest'
import { calculateKanbanOrder, findCard, moveCardToColumn, resolveDrop } from './kanban'
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

function dropCard(id: string, status: KanbanBoard['columns'][number]['status'], order: number) {
  return { id, title: id, company: 'C', location: null, ghostDays: 0, status, kanbanOrder: order, lastActivityAt: null, createdAt: '' }
}
function dropBoard(): KanbanBoard {
  return {
    columns: [
      { status: 'WISHLIST', jobs: [dropCard('a', 'WISHLIST', 1), dropCard('b', 'WISHLIST', 2)] },
      { status: 'APPLIED', jobs: [dropCard('c', 'APPLIED', 1)] },
      { status: 'INTERVIEWING', jobs: [] },
      { status: 'OFFER', jobs: [] },
      { status: 'REJECTED', jobs: [] },
      { status: 'ARCHIVED', jobs: [] },
    ],
    stats: { totalJobs: 3, byStatus: { WISHLIST: 2, APPLIED: 1, INTERVIEWING: 0, OFFER: 0, REJECTED: 0, ARCHIVED: 0 }, ghostAlerts: 0, recentActivity: 3 },
  }
}

describe('resolveDrop', () => {
  it('moves cross-column (status change) when not filtered', () => {
    const b = dropBoard()
    const r = resolveDrop({ snapshot: b, board: b, activeId: 'a', overId: 'APPLIED', isFiltered: false })
    expect(r?.kind).toBe('move')
    if (r?.kind === 'move') expect(r.status).toBe('APPLIED')
  })

  it('cancels a within-column reorder while filtered', () => {
    const b = dropBoard()
    // origin of "a" is WISHLIST; dropping over sibling "b" (also WISHLIST) is a reorder.
    const r = resolveDrop({ snapshot: b, board: b, activeId: 'a', overId: 'b', isFiltered: true })
    expect(r).toEqual({ kind: 'cancel' })
  })

  it('allows a cross-column move while filtered, appended to the end', () => {
    const b = dropBoard()
    const r = resolveDrop({ snapshot: b, board: b, activeId: 'a', overId: 'APPLIED', isFiltered: true })
    expect(r?.kind).toBe('move')
    if (r?.kind === 'move') {
      expect(r.status).toBe('APPLIED')
      // appended after the only APPLIED card (order 1) → 2
      expect(r.kanbanOrder).toBe(2)
    }
  })

  it('uses the snapshot (origin) column, not the previewed board, to detect a reorder', () => {
    const snapshot = dropBoard()
    // Simulate onDragOver having already previewed "a" into APPLIED:
    const previewed = resolveDrop({ snapshot, board: snapshot, activeId: 'a', overId: 'APPLIED', isFiltered: false })
    expect(previewed?.kind).toBe('move')
    if (previewed?.kind !== 'move') return
    // Now the live board has "a" in APPLIED, but its ORIGIN (snapshot) is WISHLIST,
    // so while filtered this is still a cross-column move (allowed), not a reorder.
    const r = resolveDrop({ snapshot, board: previewed.board, activeId: 'a', overId: 'APPLIED', isFiltered: true })
    expect(r?.kind).toBe('move')
  })

  it('returns null for an unresolvable target', () => {
    const b = dropBoard()
    expect(resolveDrop({ snapshot: b, board: b, activeId: 'nope', overId: 'APPLIED', isFiltered: false })).toBeNull()
  })
})
