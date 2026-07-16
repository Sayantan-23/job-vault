import { AppError } from '@/shared/errors.js'
import { logger } from '@/shared/logger.js'
import { contactsRepository } from './contacts.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { timelineService } from '@/modules/timeline/timeline.service.js'
import type { JobContactRow, ContactChannel, ContactStatus } from '@/db/schema/job-contacts.js'
import type { CreateContactInput, UpdateContactInput } from './contacts.schema.js'

// Mirrors jobs.service: the timeline auto-event is a follow-on write after the
// contact mutation has committed — a failure is logged and swallowed, never
// rolling back the mutation.
async function emitAutoEntry(entry: {
  userId: string
  jobId: string
  title: string
  description?: string
}): Promise<void> {
  try {
    await timelineService.addAutoEntry(entry)
  } catch (err) {
    logger.error({ err, jobId: entry.jobId }, 'failed to write timeline auto-event')
  }
}

async function assertJobOwned(userId: string, jobId: string): Promise<void> {
  const job = await jobsRepository.findById(userId, jobId)
  if (!job) throw new AppError('NOT_FOUND', 'Job not found')
}

const CHANNEL_DESCRIPTIONS: Record<ContactChannel, string | undefined> = {
  EMAIL: 'Via email',
  LINKEDIN: 'Via LinkedIn',
  OTHER: undefined,
}

// NO_RESPONSE is the starting state, not an outcome — reverting to it emits nothing.
function statusEventTitle(status: ContactStatus, contact: string): string | null {
  switch (status) {
    case 'HEARD_BACK':
      return `Heard back from ${contact}`
    case 'REFERRED':
      return `${contact} referred you`
    case 'DECLINED':
      return `${contact} declined to refer`
    default:
      return null
  }
}

async function listForJob(userId: string, jobId: string): Promise<JobContactRow[]> {
  await assertJobOwned(userId, jobId)
  return contactsRepository.listForJob(userId, jobId)
}

async function create(userId: string, jobId: string, input: CreateContactInput): Promise<JobContactRow> {
  await assertJobOwned(userId, jobId)
  const row = await contactsRepository.create({
    userId,
    jobId,
    contact: input.contact,
    ...(input.channel !== undefined ? { channel: input.channel } : {}),
    ...(input.reachedOutAt !== undefined ? { reachedOutAt: input.reachedOutAt } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  })

  const description = row.channel ? CHANNEL_DESCRIPTIONS[row.channel] : undefined
  await emitAutoEntry({
    userId,
    jobId,
    title: `Reached out to ${row.contact}`,
    ...(description !== undefined ? { description } : {}),
  })
  return row
}

async function update(userId: string, id: string, input: UpdateContactInput): Promise<JobContactRow> {
  // Read the current row first so a status change can be detected after the
  // repo update (the repository stays pure — it never reads the prior row).
  const current = await contactsRepository.findById(userId, id)
  if (!current) throw new AppError('NOT_FOUND', 'Contact not found')

  const updated = await contactsRepository.update(userId, id, input)
  if (!updated) throw new AppError('NOT_FOUND', 'Contact not found')

  if (input.status !== undefined && input.status !== current.status) {
    const title = statusEventTitle(updated.status, updated.contact)
    if (title) await emitAutoEntry({ userId, jobId: updated.jobId, title })
  }
  return updated
}

async function remove(userId: string, id: string): Promise<{ id: string }> {
  const ok = await contactsRepository.remove(userId, id)
  if (!ok) throw new AppError('NOT_FOUND', 'Contact not found')
  return { id }
}

export const contactsService = { listForJob, create, update, remove }
