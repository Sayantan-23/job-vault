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
import { useKanban, useMoveJob } from '@/hooks/use-dashboard'
import { DASHBOARD_KANBAN_KEY } from '@/lib/query-keys'
import { calculateKanbanOrder, findCard, moveCardToColumn } from '@/lib/kanban'
import { JOB_STATUSES, type JobStatus } from '@/lib/job-status'
import { KanbanColumn } from './kanban-column'
import { GhostMeter } from '@/components/kanban/ghost-meter'
import type { KanbanBoard as Board, KanbanCard as Card } from '@/types/dashboard'

function isStatus(value: string): value is JobStatus {
  return (JOB_STATUSES as readonly string[]).includes(value)
}

/** The droppable id is either a column status, or a card id (resolve to its column). */
function resolveTargetStatus(board: Board, overId: string): JobStatus | null {
  if (isStatus(overId)) return overId
  const located = findCard(board, overId)
  return located ? located.status : null
}

export function KanbanBoard({ board: initial }: { board: Board }) {
  const qc = useQueryClient()
  const move = useMoveJob()
  const { data } = useKanban(initial)
  const board = data ?? initial
  const snapshot = useRef<Board | null>(null)
  const [activeCard, setActiveCard] = useState<Card | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function setBoard(next: Board) {
    qc.setQueryData(DASHBOARD_KANBAN_KEY, next)
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
    const targetStatus = resolveTargetStatus(board, String(over.id))
    if (!targetStatus) return
    const from = findCard(board, activeId)
    if (!from) return
    if (from.status === targetStatus) return // within-column handled on drag end

    const targetColumn = board.columns.find((c) => c.status === targetStatus)
    const index = targetColumn ? targetColumn.jobs.length : 0
    setBoard(moveCardToColumn(board, activeId, targetStatus, index))
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveCard(null)
    const { active, over } = event
    if (!over) {
      if (snapshot.current) setBoard(snapshot.current)
      return
    }
    const activeId = String(active.id)
    const targetStatus = resolveTargetStatus(board, String(over.id))
    const from = findCard(board, activeId)
    if (!targetStatus || !from) return

    // Determine the drop index within the target column.
    const overIsCard = !isStatus(String(over.id))
    const targetColumn = board.columns.find((c) => c.status === targetStatus)
    const overIndex = overIsCard
      ? (targetColumn?.jobs.findIndex((j) => j.id === String(over.id)) ?? 0)
      : (targetColumn?.jobs.length ?? 0)

    const placed = moveCardToColumn(board, activeId, targetStatus, overIndex)
    setBoard(placed)

    // Compute the persisted order from the new neighbours (excluding the moved card).
    const placedColumn = placed.columns.find((c) => c.status === targetStatus)
    const finalIndex = placedColumn?.jobs.findIndex((j) => j.id === activeId) ?? 0
    const siblings = (placedColumn?.jobs ?? []).filter((j) => j.id !== activeId)
    const kanbanOrder = calculateKanbanOrder(siblings, finalIndex)

    const before = snapshot.current
    move.mutate(
      { id: activeId, status: targetStatus, kanbanOrder },
      { onError: () => { if (before) setBoard(before) } },
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
      <div className="flex gap-3 overflow-x-auto pb-4">
        {board.columns.map((column) => (
          <KanbanColumn key={column.status} column={column} />
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
