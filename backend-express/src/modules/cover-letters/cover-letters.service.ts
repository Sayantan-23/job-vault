import { AppError } from '@/shared/errors.js'
import { geminiService } from '@/modules/ai/gemini.service.js'
import { assertWithinRateLimit } from '@/modules/ai/ai.rate-limit.js'
import { buildCoverLetterPrompt, buildRefineCoverLetterPrompt } from '@/modules/ai/ai.prompts.js'
import { aiUsageRepository } from '@/modules/ai/ai-usage.repository.js'
import { personasRepository } from '@/modules/personas/personas.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { profileService } from '@/modules/profile/profile.service.js'
import { coverLettersRepository } from './cover-letters.repository.js'
import type { AdhocJob, CoverLetterRow } from '@/db/schema/cover-letters.js'
import type { GenerateCoverLetterInput, RefineCoverLetterInput, UpdateCoverLetterInput } from './cover-letters.schema.js'

async function generate(userId: string, input: GenerateCoverLetterInput): Promise<CoverLetterRow> {
  if (!geminiService.isAiEnabled()) throw new AppError('SERVICE_UNAVAILABLE', 'AI features are not configured')

  const persona = await personasRepository.findById(userId, input.personaId)
  if (!persona) throw new AppError('NOT_FOUND', 'Persona not found')

  let jobContext: { title: string; company: string; snapshot: string | null }
  let jobId: string | null = null
  let adhocJob: AdhocJob | null = null
  if (input.jobId) {
    const job = await jobsRepository.findById(userId, input.jobId)
    if (!job) throw new AppError('NOT_FOUND', 'Job not found')
    jobContext = { title: job.title, company: job.company, snapshot: job.snapshotMarkdown }
    jobId = input.jobId
  } else {
    // The schema XOR guarantees `job` is present whenever `jobId` is absent.
    const j = input.job!
    // A blank pasted description is normalized away: omitted from the stored
    // adhocJob and the prompt gets snapshot null (decision 6).
    const description = j.description?.trim() || undefined
    adhocJob = { title: j.title, company: j.company, ...(description ? { description } : {}) }
    jobContext = { title: j.title, company: j.company, snapshot: description ?? null }
  }

  // Spend the shared hourly budget only after ownership is confirmed.
  await assertWithinRateLimit(userId)

  // Contact identity lives on the master profile: merge its saved basics over
  // the persona's own (which remain the fallback when no profile is saved).
  const savedBasics = await profileService.getSavedBasics(userId)
  const bodyMarkdown = await geminiService.generateText(
    buildCoverLetterPrompt({ ...persona.data, basics: savedBasics ?? persona.data.basics }, jobContext, input.instructions),
  )
  return coverLettersRepository.create({
    userId,
    jobId,
    adhocJob,
    personaId: input.personaId,
    // cover_letters.title is varchar(200) — clamp so a long company can't overflow it.
    title: `${jobContext.company} — cover letter`.slice(0, 200),
    instructions: input.instructions ?? null,
    bodyMarkdown,
  })
}

async function list(userId: string, jobId?: string): Promise<CoverLetterRow[]> {
  return coverLettersRepository.listForUser(userId, jobId)
}

async function get(userId: string, id: string): Promise<CoverLetterRow> {
  const cl = await coverLettersRepository.findById(userId, id)
  if (!cl) throw new AppError('NOT_FOUND', 'Cover letter not found')
  return cl
}

async function update(userId: string, id: string, input: UpdateCoverLetterInput): Promise<CoverLetterRow> {
  const patch: { title?: string; bodyMarkdown?: string } = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.bodyMarkdown !== undefined) patch.bodyMarkdown = input.bodyMarkdown
  const updated = await coverLettersRepository.update(userId, id, patch)
  if (!updated) throw new AppError('NOT_FOUND', 'Cover letter not found')
  return updated
}

async function remove(userId: string, id: string): Promise<{ id: string }> {
  const ok = await coverLettersRepository.remove(userId, id)
  if (!ok) throw new AppError('NOT_FOUND', 'Cover letter not found')
  return { id }
}

// AI-edits an existing cover letter and returns the revised body as a CANDIDATE
// — it does NOT persist. The frontend stages the result (Replace / Try again /
// Discard); the existing update() saves it on Replace.
async function refine(userId: string, id: string, input: RefineCoverLetterInput): Promise<{ bodyMarkdown: string }> {
  if (!geminiService.isAiEnabled()) throw new AppError('SERVICE_UNAVAILABLE', 'AI features are not configured')

  const cl = await coverLettersRepository.findById(userId, id)
  if (!cl) throw new AppError('NOT_FOUND', 'Cover letter not found')

  // Spend the shared hourly budget only after ownership is confirmed.
  await assertWithinRateLimit(userId)

  const bodyMarkdown = await geminiService.generateText(
    buildRefineCoverLetterPrompt(cl.bodyMarkdown, input.action, input.instructions),
  )
  // Record the usage only after a successful generation.
  await aiUsageRepository.recordUsageEvent(userId, 'cover_letter_refine')
  return { bodyMarkdown }
}

export const coverLettersService = { generate, list, get, update, remove, refine }
