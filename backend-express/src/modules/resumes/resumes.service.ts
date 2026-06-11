import { AppError } from '@/shared/errors.js'
import { geminiService } from '@/modules/ai/gemini.service.js'
import { assertWithinRateLimit } from '@/modules/ai/ai.rate-limit.js'
import { buildResumePrompt } from '@/modules/ai/ai.prompts.js'
import { ResumeContentSchema } from '@/shared/resume-content.schema.js'
import { personasRepository } from '@/modules/personas/personas.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { profileService } from '@/modules/profile/profile.service.js'
import { resumesRepository } from './resumes.repository.js'
import { renderResumeTex } from './resume-tex.js'
import type { GeneratedResumeRow } from '@/db/schema/generated-resumes.js'
import type { GenerateResumeInput, UpdateResumeInput } from './resumes.schema.js'

async function generate(userId: string, input: GenerateResumeInput): Promise<GeneratedResumeRow> {
  if (!geminiService.isAiEnabled()) throw new AppError('SERVICE_UNAVAILABLE', 'AI features are not configured')

  const persona = await personasRepository.findById(userId, input.personaId)
  if (!persona) throw new AppError('NOT_FOUND', 'Persona not found')

  let job: { title: string; company: string; snapshot?: string | null } | null = null
  let jobId: string | null = null
  if (input.jobId) {
    const j = await jobsRepository.findById(userId, input.jobId)
    if (!j) throw new AppError('NOT_FOUND', 'Job not found')
    job = { title: j.title, company: j.company, snapshot: j.snapshotMarkdown }
    jobId = j.id
  }

  // Spend the hourly rate-limit budget only after ownership is confirmed, so bad
  // input (unknown persona/job) can't burn a user's quota.
  await assertWithinRateLimit(userId)

  // Contact identity lives on the master profile: merge its saved basics over
  // the persona's own (which remain the fallback when no profile is saved).
  const savedBasics = await profileService.getSavedBasics(userId)
  const content = await geminiService.generateStructured(
    buildResumePrompt({ ...persona.data, basics: savedBasics ?? persona.data.basics }, job, input.instructions),
    ResumeContentSchema,
  )
  const title = job ? `${job.title} — ${job.company}` : persona.name
  return resumesRepository.create({
    userId,
    personaId: input.personaId,
    jobId,
    title,
    instructions: input.instructions ?? null,
    content,
  })
}

async function list(userId: string, jobId?: string): Promise<GeneratedResumeRow[]> {
  return resumesRepository.listForUser(userId, jobId)
}

async function get(userId: string, id: string): Promise<GeneratedResumeRow> {
  const r = await resumesRepository.findById(userId, id)
  if (!r) throw new AppError('NOT_FOUND', 'Résumé not found')
  return r
}

async function getTex(userId: string, id: string): Promise<string> {
  const r = await get(userId, id)
  return renderResumeTex(r.content)
}

async function update(userId: string, id: string, input: UpdateResumeInput): Promise<GeneratedResumeRow> {
  const patch: { title?: string; content?: GeneratedResumeRow['content'] } = {}
  if (input.title !== undefined) patch.title = input.title
  if (input.content !== undefined) patch.content = input.content
  const updated = await resumesRepository.update(userId, id, patch)
  if (!updated) throw new AppError('NOT_FOUND', 'Résumé not found')
  return updated
}

async function remove(userId: string, id: string): Promise<{ id: string }> {
  const ok = await resumesRepository.remove(userId, id)
  if (!ok) throw new AppError('NOT_FOUND', 'Résumé not found')
  return { id }
}

export const resumesService = { generate, list, get, getTex, update, remove }
