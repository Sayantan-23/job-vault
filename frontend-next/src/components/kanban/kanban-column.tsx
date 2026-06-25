'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { STATUS_META } from '@/lib/job-status'
import { KanbanCard } from './kanban-card'
import { cn } from '@/lib/utils'
import type { KanbanColumn as Column } from '@/types/dashboard'

export function KanbanColumn({ column }: { column: Column }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.status })
  const meta = STATUS_META[column.status]

  return (
    <div className="flex h-full w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{meta.label}</h2>
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{column.jobs.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto rounded-xl border border-hairline bg-foreground/[0.02] p-2 transition-colors',
          isOver && 'border-ring/50 bg-accent/40',
        )}
      >
        <SortableContext items={column.jobs.map((j) => j.id)} strategy={verticalListSortingStrategy}>
          {column.jobs.map((card) => (
            <KanbanCard key={card.id} card={card} />
          ))}
        </SortableContext>
        {column.jobs.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">No jobs</p>
        ) : null}
      </div>
    </div>
  )
}
