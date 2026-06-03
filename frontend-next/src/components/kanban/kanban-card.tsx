'use client'

import { useRef } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GhostMeter } from '@/components/kanban/ghost-meter'
import { cn } from '@/lib/utils'
import type { KanbanCard as Card } from '@/types/dashboard'

export function KanbanCard({ card }: { card: Card }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id })

  const style = { transform: CSS.Translate.toString(transform), transition }

  // A tap (pointer down + up without meaningful movement) opens the drawer.
  // We detect it on the capture-phase pointer events so it survives @dnd-kit's
  // drag listeners (which can swallow the synthetic click once a drag activates);
  // the movement threshold distinguishes a click from a drag-release.
  const downAt = useRef<{ x: number; y: number } | null>(null)
  const open = () => {
    const params = new URLSearchParams(searchParams)
    params.set('job', card.id)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <button
      ref={setNodeRef}
      style={style}
      type="button"
      onPointerDownCapture={(e) => {
        downAt.current = { x: e.clientX, y: e.clientY }
      }}
      onPointerUpCapture={(e) => {
        const start = downAt.current
        downAt.current = null
        if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 6) open()
      }}
      {...attributes}
      {...listeners}
      className={cn(
        'w-full cursor-grab touch-none rounded-lg border border-border bg-card p-3 text-left transition-colors',
        'hover:border-ring/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isDragging && 'opacity-50',
      )}
    >
      <p className="truncate text-sm font-medium">{card.title}</p>
      <p className="truncate text-xs text-muted-foreground">
        <span>{card.company}</span>
        {card.location ? <span>{` · ${card.location}`}</span> : null}
      </p>
      <div className="mt-2">
        <GhostMeter days={card.ghostDays} />
      </div>
    </button>
  )
}
