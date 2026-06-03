'use client'

import { ReminderItem } from './reminder-item'
import type { Reminder } from '@/types/reminder'

export function ReminderList({
  reminders,
  onToggleComplete,
  onDelete,
}: {
  reminders: Reminder[]
  onToggleComplete: (reminder: Reminder) => void
  onDelete: (id: string) => void
}) {
  if (reminders.length === 0) {
    return <p className="text-sm text-muted-foreground">No reminders yet.</p>
  }
  return (
    <div className="space-y-2">
      {reminders.map((reminder) => (
        <ReminderItem
          key={reminder.id}
          reminder={reminder}
          onToggleComplete={onToggleComplete}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
