import { JOB_STATUSES, type JobStatus } from '@/lib/job-status'
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

export function isStatus(value: string): value is JobStatus {
  return (JOB_STATUSES as readonly string[]).includes(value)
}

export type DropResult =
  | { kind: 'cancel' }
  | { kind: 'move'; board: KanbanBoard; status: JobStatus; kanbanOrder: number }

// Decides what a drag drop should do. `snapshot` is the board at drag-start
// (the origin truth); `board` is the current (possibly preview-moved) board;
// `overId` is a column status or a card id. While filtered, a within-column
// reorder is cancelled and a cross-column move is appended to the target's end.
export function resolveDrop(args: {
  snapshot: KanbanBoard
  board: KanbanBoard
  activeId: string
  overId: string
  isFiltered: boolean
}): DropResult | null {
  const { snapshot, board, activeId, overId, isFiltered } = args
  const targetStatus = isStatus(overId) ? overId : (findCard(board, overId)?.status ?? null)
  if (!targetStatus) return null
  const origin = findCard(snapshot, activeId)
  if (!origin) return null

  // Within-column reorder while filtered → suppressed (fractional order would be
  // computed against possibly-hidden neighbours).
  if (isFiltered && origin.status === targetStatus) return { kind: 'cancel' }

  const targetColumn = board.columns.find((c) => c.status === targetStatus)
  const overIsCard = !isStatus(overId)
  const overIndex = isFiltered
    ? (targetColumn?.jobs.length ?? 0) // force append-to-end when filtered (collision-safe)
    : overIsCard
      ? (targetColumn?.jobs.findIndex((j) => j.id === overId) ?? 0)
      : (targetColumn?.jobs.length ?? 0)

  const placed = moveCardToColumn(board, activeId, targetStatus, overIndex)
  const placedColumn = placed.columns.find((c) => c.status === targetStatus)
  const finalIndex = placedColumn?.jobs.findIndex((j) => j.id === activeId) ?? 0
  const siblings = (placedColumn?.jobs ?? []).filter((j) => j.id !== activeId)
  const kanbanOrder = calculateKanbanOrder(siblings, finalIndex)
  return { kind: 'move', board: placed, status: targetStatus, kanbanOrder }
}
