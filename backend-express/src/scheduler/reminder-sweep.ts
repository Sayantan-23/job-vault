import { remindersRepository } from '@/modules/reminders/reminders.repository.js'
import { notificationsService } from '@/modules/notifications/notifications.service.js'

/**
 * Turns every past-due, not-completed reminder into a REMINDER notification and
 * marks it completed (so it never re-fires). `now` is injected for testability and
 * is forwarded unchanged to findDue, which compares it against the stored UTC
 * remindAt. Returns the number of reminders swept.
 */
export async function sweepDueReminders(now: Date): Promise<number> {
  const due = await remindersRepository.findDue(now)
  if (due.length === 0) return 0

  for (const reminder of due) {
    await notificationsService.create({
      userId: reminder.userId,
      message: reminder.message,
      type: 'REMINDER',
      relatedJobId: reminder.jobId,
    })
  }
  await remindersRepository.markCompleted(due.map((r) => r.id))
  return due.length
}
