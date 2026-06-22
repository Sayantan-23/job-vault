import { AppError } from '@/shared/errors.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { jobsService } from '@/modules/jobs/jobs.service.js'
import { authRepository } from '@/modules/auth/auth.repository.js'
import { normalizeJobUrl, type ScrapeResult } from '@/modules/jobs/scraper.js'
import type { CreateJobInput } from '@/modules/jobs/jobs.schema.js'
import type { JobStatus } from '@/db/schema/jobs.js'
import type { QuickCreateJobInput } from './extension.schema.js'

const EXTENSION_AUTO_ENTRY_TITLE = 'Added via Chrome Extension'

export interface JobSummary {
  id: string
  title: string
  company: string
  status: JobStatus
}

function summarize(job: { id: string; title: string; company: string; status: JobStatus }): JobSummary {
  return { id: job.id, title: job.title, company: job.company, status: job.status }
}

/** Confirms the key resolves to a live account; returns who it's connected as. */
async function verifyKey(userId: string): Promise<{ ok: true; user: { email: string } }> {
  const user = await authRepository.findById(userId)
  if (!user) throw new AppError('UNAUTHORIZED', 'Account not found')
  return { ok: true, user: { email: user.email } }
}

/** Dedup probe used by the popup before saving — keys off the normalized URL. */
async function checkUrl(userId: string, url: string): Promise<{ isDuplicate: boolean; job?: JobSummary }> {
  const existing = await jobsRepository.findBySourceUrl(userId, normalizeJobUrl(url))
  if (!existing) return { isDuplicate: false }
  return { isDuplicate: true, job: summarize(existing) }
}

/**
 * One-click save. Normalizes the source URL, returns the existing job untouched
 * if it's already saved, else creates a WISHLIST job attributed to the extension.
 */
async function quickCreateJob(
  userId: string,
  input: QuickCreateJobInput,
): Promise<JobSummary & { isDuplicate: boolean }> {
  const normalizedUrl = input.sourceUrl ? normalizeJobUrl(input.sourceUrl) : undefined
  if (normalizedUrl) {
    const existing = await jobsRepository.findBySourceUrl(userId, normalizedUrl)
    if (existing) return { ...summarize(existing), isDuplicate: true }
  }

  const createInput: CreateJobInput = { title: input.title, company: input.company }
  if (input.location !== undefined) createInput.location = input.location
  if (input.salaryRange !== undefined) createInput.salaryRange = input.salaryRange
  if (normalizedUrl !== undefined) createInput.sourceUrl = normalizedUrl
  const snapshot = input.snapshotMarkdown ?? input.description
  if (snapshot !== undefined) createInput.snapshotMarkdown = snapshot

  const job = await jobsService.create(userId, createInput, { autoEntryTitle: EXTENSION_AUTO_ENTRY_TITLE })
  return { ...summarize(job), isDuplicate: false }
}

/** Server-side scrape fallback for pages the content script can't parse. */
async function scrape(userId: string, sourceUrl: string): Promise<ScrapeResult> {
  return jobsService.scrape(userId, sourceUrl)
}

export const extensionService = { verifyKey, checkUrl, quickCreateJob, scrape }
