import { AppError } from '@/shared/errors.js'
import { jobsRepository } from './jobs.repository.js'
import { scrapeUrl, type ScrapeResult } from './scraper.js'
import type { JobRow, NewJobRow } from '@/db/schema/jobs.js'
import type { CreateJobInput, UpdateJobInput, MoveJobInput, JobQueryInput } from './jobs.schema.js'

async function create(userId: string, input: CreateJobInput): Promise<JobRow> {
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

  return jobsRepository.create(values)
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
  const job = await jobsRepository.update(userId, id, input)
  if (!job) throw new AppError('NOT_FOUND', 'Job not found')
  return job
}

async function move(userId: string, id: string, input: MoveJobInput): Promise<JobRow> {
  const job = await jobsRepository.move(userId, id, input.status, input.kanbanOrder)
  if (!job) throw new AppError('NOT_FOUND', 'Job not found')
  return job
}

async function remove(userId: string, id: string): Promise<void> {
  const ok = await jobsRepository.remove(userId, id)
  if (!ok) throw new AppError('NOT_FOUND', 'Job not found')
}

async function scrape(url: string): Promise<ScrapeResult> {
  try {
    return await scrapeUrl(url)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to scrape URL'
    throw new AppError('VALIDATION_ERROR', `Scraping failed: ${message}`, err)
  }
}

export const jobsService = { create, list, get, update, move, remove, scrape }
