import { AppError } from '@/shared/errors.js'
import { logger } from '@/shared/logger.js'
import { jobsRepository } from './jobs.repository.js'
import { timelineService } from '@/modules/timeline/timeline.service.js'
import { scrapeUrl, type ScrapeResult } from './scraper.js'
import { createScrapeFallback } from './scrape-fallback.js'
import type { JobRow, NewJobRow } from '@/db/schema/jobs.js'
import type { CreateJobInput, UpdateJobInput, MoveJobInput, JobQueryInput } from './jobs.schema.js'

// The auto-event is a follow-on write after the job mutation has already
// committed. The job mutation is the source of truth, so a timeline write
// failure is logged and swallowed — it must never roll back the mutation.
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

// Lets a caller (e.g. the extension's quick-create) attribute the source of a
// new job in its auto-timeline entry. Omitted → the default "added to vault" text.
interface CreateJobOptions {
  autoEntryTitle?: string
  autoEntryDescription?: string
}

async function create(userId: string, input: CreateJobInput, options?: CreateJobOptions): Promise<JobRow> {
  const status = input.status ?? 'WISHLIST'
  const kanbanOrder = await jobsRepository.nextKanbanOrder(userId, status)

  const values: NewJobRow = {
    userId,
    title: input.title,
    company: input.company,
    status,
    kanbanOrder,
    lastActivityAt: new Date(),
  }
  if (input.location !== undefined) values.location = input.location
  if (input.salaryRange !== undefined) values.salaryRange = input.salaryRange
  if (input.sourceUrl !== undefined) values.sourceUrl = input.sourceUrl
  if (input.snapshotMarkdown !== undefined) values.snapshotMarkdown = input.snapshotMarkdown
  if (input.notes !== undefined) values.notes = input.notes

  const job = await jobsRepository.create(values)
  await emitAutoEntry({
    userId,
    jobId: job.id,
    title: options?.autoEntryTitle ?? 'Job added to vault',
    description: options?.autoEntryDescription ?? `Added to ${job.status} column`,
  })
  return job
}

async function list(
  userId: string,
  query: JobQueryInput,
): Promise<{ rows: JobRow[]; total: number; page: number; limit: number }> {
  const { rows, total } = await jobsRepository.findAll(userId, query)
  return { rows, total, page: query.page, limit: query.limit }
}

async function get(userId: string, id: string): Promise<JobRow> {
  const job = await jobsRepository.findById(userId, id)
  if (!job) throw new AppError('NOT_FOUND', 'Job not found')
  return job
}

async function update(userId: string, id: string, input: UpdateJobInput): Promise<JobRow> {
  // Read the current status first so we can detect a status change after the
  // repo update (the repository stays pure — it never reads the prior row).
  const current = await jobsRepository.findById(userId, id)
  const oldStatus = current?.status

  const job = await jobsRepository.update(userId, id, input)
  if (!job) throw new AppError('NOT_FOUND', 'Job not found')

  if (input.status !== undefined && oldStatus !== undefined && input.status !== oldStatus) {
    await emitAutoEntry({
      userId,
      jobId: job.id,
      title: `Status changed to ${job.status}`,
      description: `Moved from ${oldStatus} to ${job.status}`,
    })
  }
  return job
}

async function move(userId: string, id: string, input: MoveJobInput): Promise<JobRow> {
  const current = await jobsRepository.findById(userId, id)
  const oldStatus = current?.status

  const job = await jobsRepository.move(userId, id, input.status, input.kanbanOrder)
  if (!job) throw new AppError('NOT_FOUND', 'Job not found')

  if (oldStatus !== undefined && input.status !== oldStatus) {
    await emitAutoEntry({
      userId,
      jobId: job.id,
      title: `Status changed to ${job.status}`,
      description: `Moved from ${oldStatus} to ${job.status}`,
    })
  }
  return job
}

async function remove(userId: string, id: string): Promise<void> {
  const ok = await jobsRepository.remove(userId, id)
  if (!ok) throw new AppError('NOT_FOUND', 'Job not found')
}

// Overall ceiling on a single scrape so a slow static+render+AI chain can't tie
// up the request near the Next proxy's timeout. Comfortably above the normal
// path (~static 15s + render ~16s + AI ~10s) but well under the proxy budget.
const SCRAPE_DEADLINE_MS = 90_000

async function scrape(userId: string, url: string): Promise<ScrapeResult> {
  try {
    // The render+AI fallback fires only when the fast static path returns a shell
    // (CSR SPA / bot-protected board); see scrape-fallback.ts. AI spend is bound
    // to the user's hourly budget.
    return await withDeadline(scrapeUrl(url, createScrapeFallback(userId)), SCRAPE_DEADLINE_MS)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to scrape URL'
    throw new AppError('VALIDATION_ERROR', `Scraping failed: ${message}`, err)
  }
}

// Races a promise against a deadline. The underlying work may keep running after
// a timeout (its own per-step timeouts bound it), so swallow its late rejection
// to avoid an unhandled-rejection warning.
function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T> {
  promise.catch(() => undefined)
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Scrape timed out')), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (err: unknown) => {
        clearTimeout(timer)
        reject(err instanceof Error ? err : new Error(String(err)))
      },
    )
  })
}

export const jobsService = { create, list, get, update, move, remove, scrape }
