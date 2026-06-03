'use client'

import { useReminders, useCreateReminder, useUpdateReminder, useDeleteReminder } from '@/hooks/use-reminders'
import { ReminderList } from './reminder-list'
import { ReminderForm, type ReminderFormValues } from './reminder-form'
import type { Reminder } from '@/types/reminder'

export function RemindersSection({ jobId }: { jobId: string }) {
  const { data: reminders = [] } = useReminders(jobId)
  const create = useCreateReminder(jobId)
  const update = useUpdateReminder(jobId)
  const remove = useDeleteReminder(jobId)

  function handleSubmit(values: ReminderFormValues) {
    create.mutate(values)
  }

  function handleToggleComplete(reminder: Reminder) {
    update.mutate({ id: reminder.id, patch: { isCompleted: !reminder.isCompleted } })
  }

  return (
    <section className="space-y-4">
      <h3 className="text-sm font-semibold">Reminders</h3>
      <ReminderList reminders={reminders} onToggleComplete={handleToggleComplete} onDelete={(id) => remove.mutate(id)} />
      <ReminderForm onSubmit={handleSubmit} isPending={create.isPending} />
    </section>
  )
}
