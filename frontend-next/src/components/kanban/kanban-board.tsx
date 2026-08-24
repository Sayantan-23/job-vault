'use client'

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useMoveJob } from '@/hooks/use-dashboard'
import { kanbanKey } from '@/lib/query-keys'
import { findCard, moveCardToColumn, resolveDrop, isStatus } from '@/lib/kanban'
import { KanbanColumn } from './kanban-column'
import { GhostMeter } from '@/components/kanban/ghost-meter'
import { ReorderPausedHint } from './reorder-paused-hint'
import type { GhostFilter } from '@/types/filters'
import type { KanbanBoard as Board, KanbanCard as Card } from '@/types/dashboard'

export function KanbanBoard({
  board,
  filters,
  isFiltered,
  loading = false,
}: {
  board: Board
  filters: { search: string; ghost: GhostFilter }
  isFiltered: boolean
  /** First load of this board: columns render empty, so say "Loading…" rather
   * than asserting "No jobs". */
  loading?: boolean
}) {
  const qc = useQueryClient()
  const move = useMoveJob()
  const key = kanbanKey(filters)
  const snapshot = useRef<Board | null>(null)
  const [activeCard, setActiveCard] = useState<Card | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function setBoard(next: Board) {
    qc.setQueryData(key, next)
  }

  function onDragStart(event: DragStartEvent) {
    snapshot.current = board
    const located = findCard(board, String(event.active.id))
    if (located) {
      const col = board.columns.find((c) => c.status === located.status)
      setActiveCard(col?.jobs[located.index] ?? null)
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    const targetStatus = isStatus(overId) ? overId : (findCard(board, overId)?.status ?? null)
    if (!targetStatus) return
    const from = findCard(board, activeId)
    if (!from || from.status === targetStatus) return // within-column handled on drag end
    const targetColumn = board.columns.find((c) => c.status === targetStatus)
    const index = targetColumn ? targetColumn.jobs.length : 0
    setBoard(moveCardToColumn(board, activeId, targetStatus, index))
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveCard(null)
    const { active, over } = event
    const before = snapshot.current
    const restore = () => { if (before) setBoard(before) }
    // No drop target, no drag-start snapshot, an unresolved target, or a
    // suppressed reorder all undo any optimistic preview onDragOver may have left.
    if (!over || !before) {
      restore()
      return
    }
    const result = resolveDrop({
      snapshot: before,
      board,
      activeId: String(active.id),
      overId: String(over.id),
      isFiltered,
    })
    if (!result || result.kind === 'cancel') {
      restore()
      return
    }
    setBoard(result.board)
    move.mutate(
      { id: String(active.id), status: result.status, kanbanOrder: result.kanbanOrder },
      { onError: restore },
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      {isFiltered ? <ReorderPausedHint /> : null}
      <div className="flex h-full gap-3 overflow-x-auto pb-4">
        {board.columns.map((column) => (
          <KanbanColumn key={column.status} column={column} loading={loading} />
        ))}
      </div>
      <DragOverlay>
        {activeCard ? (
          <div className="w-72 rounded-lg border border-border bg-card p-3 shadow-lg">
            <p className="truncate text-sm font-medium">{activeCard.title}</p>
            <p className="truncate text-xs text-muted-foreground">{activeCard.company}</p>
            <div className="mt-2">
              <GhostMeter days={activeCard.ghostDays} />
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
