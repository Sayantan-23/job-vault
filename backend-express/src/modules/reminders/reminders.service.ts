import { AppError } from '@/shared/errors.js'
import { remindersRepository } from './reminders.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import type { ReminderRow } from '@/db/schema/reminders.js'
import type { CreateReminderInput, UpdateReminderInput } from './reminders.schema.js'

async function assertJobOwned(userId: string, jobId: string): Promise<void> {
  const job = await jobsRepository.findById(userId, jobId)
  if (!job) throw new AppError('NOT_FOUND', 'Job not found')
}

async function listForJob(userId: string, jobId: string): Promise<ReminderRow[]> {
  await assertJobOwned(userId, jobId)
  return remindersRepository.listForJob(userId, jobId)
}

async function create(userId: string, jobId: string, input: CreateReminderInput): Promise<ReminderRow> {
  await assertJobOwned(userId, jobId)
  return remindersRepository.create({ userId, jobId, message: input.message, remindAt: input.remindAt })
}

async function update(userId: string, id: string, input: UpdateReminderInput): Promise<ReminderRow> {
  const updated = await remindersRepository.update(userId, id, input)
  if (!updated) throw new AppError('NOT_FOUND', 'Reminder not found')
  return updated
}

async function remove(userId: string, id: string): Promise<{ id: string }> {
  const ok = await remindersRepository.remove(userId, id)
  if (!ok) throw new AppError('NOT_FOUND', 'Reminder not found')
  return { id }
}

export const remindersService = { listForJob, create, update, remove }
