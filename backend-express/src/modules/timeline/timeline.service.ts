import { AppError } from '@/shared/errors.js'
import { timelineRepository } from './timeline.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import type { TimelineEventRow, NewTimelineEventRow } from '@/db/schema/timeline.js'
import type { CreateTimelineEntryInput } from './timeline.schema.js'

export interface AutoEntryInput {
  userId: string
  jobId: string
  title: string
  description?: string
}

async function assertJobOwned(userId: string, jobId: string): Promise<void> {
  const job = await jobsRepository.findById(userId, jobId)
  if (!job) throw new AppError('NOT_FOUND', 'Job not found')
}

async function list(userId: string, jobId: string): Promise<TimelineEventRow[]> {
  await assertJobOwned(userId, jobId)
  return timelineRepository.findByJob(jobId)
}

async function addManualEntry(
  userId: string,
  jobId: string,
  input: CreateTimelineEntryInput,
): Promise<TimelineEventRow> {
  await assertJobOwned(userId, jobId)

  const values: NewTimelineEventRow = { userId, jobId, type: 'MANUAL', title: input.title }
  if (input.description !== undefined) values.description = input.description

  const event = await timelineRepository.create(values)
  // jobsRepository.update refreshes lastActivityAt on every call; an empty patch
  // is therefore a pure activity bump (a manual note counts as activity).
  await jobsRepository.update(userId, jobId, {})
  return event
}

async function addAutoEntry(input: AutoEntryInput): Promise<TimelineEventRow> {
  const values: NewTimelineEventRow = {
    userId: input.userId,
    jobId: input.jobId,
    type: 'AUTO',
    title: input.title,
  }
  if (input.description !== undefined) values.description = input.description
  return timelineRepository.create(values)
}

export const timelineService = { list, addManualEntry, addAutoEntry }
