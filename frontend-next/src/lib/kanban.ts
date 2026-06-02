import type { JobStatus } from '@/lib/job-status'
import type { KanbanBoard, KanbanCard } from '@/types/dashboard'

/** Fractional-float order for inserting at `index` among `siblings` (sorted asc). */
export function calculateKanbanOrder(siblings: { kanbanOrder: number }[], index: number): number {
  if (siblings.length === 0) return 1
  if (index <= 0) {
    const first = siblings[0]
    return first ? first.kanbanOrder / 2 : 1
  }
  if (index >= siblings.length) {
    const last = siblings[siblings.length - 1]
    return last ? last.kanbanOrder + 1 : 1
  }
  const before = siblings[index - 1]
  const after = siblings[index]
  if (!before || !after) return 1
  return (before.kanbanOrder + after.kanbanOrder) / 2
}

export function findCard(board: KanbanBoard, id: string): { status: JobStatus; index: number } | null {
  for (const column of board.columns) {
    const index = column.jobs.findIndex((j) => j.id === id)
    if (index !== -1) return { status: column.status, index }
  }
  return null
}

/** Immutably remove `id` from its column and insert it into `toStatus` at `toIndex`. */
export function moveCardToColumn(board: KanbanBoard, id: string, toStatus: JobStatus, toIndex: number): KanbanBoard {
  let moved: KanbanCard | undefined
  for (const column of board.columns) {
    const found = column.jobs.find((j) => j.id === id)
    if (found) moved = found
  }
  if (!moved) return board

  const card: KanbanCard = { ...moved, status: toStatus }
  const columns = board.columns.map((column) => {
    const withoutCard = column.jobs.filter((j) => j.id !== id)
    if (column.status !== toStatus) return { ...column, jobs: withoutCard }
    const clamped = Math.max(0, Math.min(toIndex, withoutCard.length))
    const jobs = [...withoutCard.slice(0, clamped), card, ...withoutCard.slice(clamped)]
    return { ...column, jobs }
  })
  return { ...board, columns }
}
