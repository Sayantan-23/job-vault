import { AppError } from '@/shared/errors.js'
import { getEnv } from '@/config/env.js'
import { ensureIds, type ProfileContent } from '@/shared/profile-content.schema.js'
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

// Plain save — manual creation needs no AI. The only AI persona path is
// POST /personas/parse-resume, which pre-fills `data` before this runs.
async function create(userId: string, input: CreatePersonaInput): Promise<PersonaRow> {
  const max = getEnv().MAX_PERSONAS
  // Read-then-check cap: a tolerable race for a single-user personal tool (two
  // concurrent creates could both pass at count = max - 1). Tighten with a DB
  // constraint if it ever matters.
  const current = await personasRepository.countForUser(userId)
  if (current >= max) throw new AppError('CONFLICT', `Persona limit reached (max ${max})`)
  return personasRepository.create({
    userId,
    name: input.name,
    data: ensureIds(input.data),
    rawInput: input.rawInput ?? null,
  })
}

async function update(userId: string, id: string, input: UpdatePersonaInput): Promise<PersonaRow> {
  const patch: { name?: string; data?: ProfileContent } = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.data !== undefined) patch.data = ensureIds(input.data)
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
