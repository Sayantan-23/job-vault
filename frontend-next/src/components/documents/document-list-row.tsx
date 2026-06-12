'use client'

import type { KeyboardEvent, MouseEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { shortDate } from '@/lib/relative-time'

export interface DocumentRow {
  id: string
  title: string // letter/résumé title — the caller falls back to 'Untitled'
  context: string // job context, e.g. 'Acme · Staff Engineer' | 'General' | '—'
  personaName: string // mapped by the caller; fallback '—'
  createdAt: string // ISO timestamp, rendered via shortDate
}

// Text columns get proportional shrinkable shares (minmax(0,…) so they can
// truncate); the date + delete columns hug their content.
const GRID = 'grid grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto_auto] items-center gap-4'

interface Props {
  row: DocumentRow
  selected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function DocumentListRow({ row, selected, onSelect, onDelete }: Props) {
  // The row hosts the delete <button>, so it cannot be a <button> itself
  // (nested buttons are invalid HTML) — it is a div with button semantics.
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return // key events bubbling from the delete button
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelect(row.id)
  }

  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onDelete(row.id)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      onClick={() => onSelect(row.id)}
      onKeyDown={handleKeyDown}
      className={cn(
        GRID,
        'cursor-pointer px-3 py-2.5 text-sm transition-colors hover:bg-accent/50',
        selected && 'bg-accent',
      )}
    >
      <span className="truncate font-medium">{row.title}</span>
      <span className="truncate text-muted-foreground">{row.context}</span>
      <span className="truncate text-muted-foreground">{row.personaName}</span>
      <span className="font-mono text-xs tabular-nums text-muted-foreground">{shortDate(row.createdAt)}</span>
      <Button
        type="button"
        variant="ghost"
        size="iconSm"
        aria-label={`Delete ${row.title}`}
        onClick={handleDelete}
        className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
      </Button>
    </div>
  )
}
