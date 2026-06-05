import { AppError } from '@/shared/errors.js'
import { getEnv } from '@/config/env.js'
import { geminiService } from '@/modules/ai/gemini.service.js'
import { buildStructurePrompt } from '@/modules/ai/ai.prompts.js'
import { ResumeContentSchema, type ResumeContent } from '@/shared/resume-content.schema.js'
import { personasRepository } from './personas.repository.js'
import type { PersonaRow } from '@/db/schema/personas.js'
import type { CreatePersonaInput, UpdatePersonaInput } from './personas.schema.js'

async function list(userId: string): Promise<PersonaRow[]> {
  return personasRepository.listForUser(userId)
}

async function get(userId: string, id: string): Promise<PersonaRow> {
  const persona = await personasRepository.findById(userId, id)
  if (!persona) throw new AppError('NOT_FOUND', 'Persona not found')
  return persona
}

async function create(userId: string, input: CreatePersonaInput): Promise<PersonaRow> {
  if (!geminiService.isAiEnabled()) throw new AppError('SERVICE_UNAVAILABLE', 'AI features are not configured')
  const max = getEnv().MAX_PERSONAS
  // Read-then-check cap: a tolerable race for a single-user personal tool (two
  // concurrent creates could both pass at count = max - 1). Tighten with a DB
  // constraint if it ever matters.
  const current = await personasRepository.countForUser(userId)
  if (current >= max) throw new AppError('CONFLICT', `Persona limit reached (max ${max})`)
  // generateStructured already Zod-validates against ResumeContentSchema, so its
  // result is a ready-to-store ResumeContent — no second parse needed.
  const data = await geminiService.generateStructured(buildStructurePrompt(input.inputs), ResumeContentSchema)
  const rawInput = [input.inputs.pastedResume, input.inputs.freeText].filter(Boolean).join('\n\n') || null
  return personasRepository.create({ userId, name: input.name, data, rawInput })
}

async function update(userId: string, id: string, input: UpdatePersonaInput): Promise<PersonaRow> {
  const patch: { name?: string; data?: ResumeContent } = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.data !== undefined) patch.data = input.data
  const updated = await personasRepository.update(userId, id, patch)
  if (!updated) throw new AppError('NOT_FOUND', 'Persona not found')
  return updated
}

async function remove(userId: string, id: string): Promise<{ id: string }> {
  const ok = await personasRepository.remove(userId, id)
  if (!ok) throw new AppError('NOT_FOUND', 'Persona not found')
  return { id }
}

export const personasService = { list, get, create, update, remove }
