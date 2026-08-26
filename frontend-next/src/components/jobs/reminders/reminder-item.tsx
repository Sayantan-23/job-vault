'use client'

import { Check, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useConfirm } from '@/hooks/use-confirm'
import { isPast } from '@/lib/relative-time'
import type { Reminder } from '@/types/reminder'

export function ReminderItem({
  reminder,
  onToggleComplete,
  onDelete,
}: {
  reminder: Reminder
  onToggleComplete: (reminder: Reminder) => void
  onDelete: (id: string) => void
}) {
  const overdue = !reminder.isCompleted && isPast(reminder.remindAt)
  const due = new Date(reminder.remindAt)
  const { confirm, confirmDialog } = useConfirm()

  const onDeleteClick = async () => {
    if (await confirm({ title: 'Delete reminder?', description: reminder.message, confirmLabel: 'Delete', destructive: true })) {
      onDelete(reminder.id)
    }
  }

  return (
    <div
      data-testid="reminder-item"
      data-overdue={overdue ? 'true' : 'false'}
      className="flex items-start justify-between gap-3 rounded-lg border border-border px-3 py-2"
    >
      <div className="min-w-0 space-y-0.5">
        <p className={cn('text-sm leading-snug', reminder.isCompleted && 'text-muted-foreground line-through')}>
          {reminder.message}
        </p>
        <p className={cn('font-mono text-xs', overdue ? 'text-destructive' : 'text-muted-foreground')}>
          {due.toLocaleString()}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={reminder.isCompleted ? 'Mark incomplete' : 'Complete'}
          onClick={() => onToggleComplete(reminder)}
        >
          <Check className={cn('size-4', reminder.isCompleted && 'text-primary')} aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Delete reminder" onClick={onDeleteClick}>
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
      {confirmDialog}
    </div>
  )
}
