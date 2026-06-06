import { AppError } from '@/shared/errors.js'
import { geminiService } from '@/modules/ai/gemini.service.js'
import { assertWithinRateLimit } from '@/modules/ai/ai.rate-limit.js'
import { buildCoverLetterPrompt } from '@/modules/ai/ai.prompts.js'
import { personasRepository } from '@/modules/personas/personas.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { coverLettersRepository } from './cover-letters.repository.js'
import type { CoverLetterRow } from '@/db/schema/cover-letters.js'
import type { GenerateCoverLetterInput, UpdateCoverLetterInput } from './cover-letters.schema.js'

async function generate(userId: string, input: GenerateCoverLetterInput): Promise<CoverLetterRow> {
  if (!geminiService.isAiEnabled()) throw new AppError('SERVICE_UNAVAILABLE', 'AI features are not configured')

  const job = await jobsRepository.findById(userId, input.jobId)
  if (!job) throw new AppError('NOT_FOUND', 'Job not found')
  const persona = await personasRepository.findById(userId, input.personaId)
  if (!persona) throw new AppError('NOT_FOUND', 'Persona not found')

  // Spend the shared hourly budget only after ownership is confirmed.
  await assertWithinRateLimit(userId)

  const bodyMarkdown = await geminiService.generateText(
    buildCoverLetterPrompt(persona.data, { title: job.title, company: job.company, snapshot: job.snapshotMarkdown }, input.instructions),
  )
  return coverLettersRepository.create({
    userId,
    jobId: input.jobId,
    personaId: input.personaId,
    title: `${job.company} — cover letter`,
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

export const coverLettersService = { generate, list, get, update, remove }
