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

interface Props {
  row: DocumentRow
  selected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

// Two-line row (title above, muted metadata below) so the details have room to
// breathe instead of cramming title/context/persona/date onto one line.
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

  const hasPersona = Boolean(row.personaName) && row.personaName !== '—'

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      onClick={() => onSelect(row.id)}
      onKeyDown={handleKeyDown}
      className={cn(
        'flex cursor-pointer items-center gap-3 px-3.5 py-3 text-sm transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        selected ? 'bg-accent' : 'hover:bg-accent/50',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{row.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          <span>{row.context}</span>
          {hasPersona ? (
            <>
              <span aria-hidden="true" className="px-1.5 text-muted-foreground/50">
                ·
              </span>
              <span>{row.personaName}</span>
            </>
          ) : null}
        </p>
      </div>
      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{shortDate(row.createdAt)}</span>
      <Button
        type="button"
        variant="ghost"
        size="iconSm"
        aria-label={`Delete ${row.title}`}
        onClick={handleDelete}
        className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
