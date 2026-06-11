import pdfParse from 'pdf-parse'
import { AppError } from '@/shared/errors.js'
import { getEnv } from '@/config/env.js'
import { ensureIds, ProfileContentSchema, type ProfileContent } from '@/shared/profile-content.schema.js'
import { geminiService } from '@/modules/ai/gemini.service.js'
import { assertWithinRateLimit } from '@/modules/ai/ai.rate-limit.js'
import { aiUsageRepository } from '@/modules/ai/ai-usage.repository.js'
import { buildStructurePrompt } from '@/modules/ai/ai.prompts.js'
import { personasRepository } from './personas.repository.js'
import type { PersonaRow } from '@/db/schema/personas.js'
import type { CreatePersonaInput, UpdatePersonaInput } from './personas.schema.js'

// Combined paste+PDF text is clamped before prompting so a giant input can't
// blow up the prompt; the clamped text is also what gets stored as rawInput.
const MAX_PARSE_INPUT_CHARS = 50_000

export interface ParseResumeArgs {
  text?: string | undefined
  fileBuffer?: Buffer | undefined
}

export interface ParsedResume {
  content: ProfileContent
  rawText: string
}

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

// The only AI persona path: extract text (PDF in-memory and/or pasted text),
// have the model structure it as ProfileContent, and spend one unit of the
// shared hourly limit — recorded only after a successful parse.
async function parseResume(userId: string, args: ParseResumeArgs): Promise<ParsedResume> {
  if (!geminiService.isAiEnabled()) throw new AppError('SERVICE_UNAVAILABLE', 'AI features are not configured')

  // Fail fast: parsing is pointless if the resulting persona could not be saved.
  const max = getEnv().MAX_PERSONAS
  const current = await personasRepository.countForUser(userId)
  if (current >= max) throw new AppError('CONFLICT', `Persona limit reached (max ${max})`)

  await assertWithinRateLimit(userId)

  let extracted = ''
  if (args.fileBuffer) {
    try {
      extracted = (await pdfParse(args.fileBuffer)).text
    } catch (err) {
      throw new AppError('VALIDATION_ERROR', 'Could not read that PDF — try pasting the text instead', err)
    }
  }
  const combined = [extracted, args.text]
    .filter((s): s is string => Boolean(s?.trim()))
    .join('\n\n')
    .slice(0, MAX_PARSE_INPUT_CHARS)
  if (!combined) throw new AppError('VALIDATION_ERROR', 'Provide a PDF or pasted text')

  const content = ensureIds(
    await geminiService.generateStructured(buildStructurePrompt(combined), ProfileContentSchema),
  )
  await aiUsageRepository.recordResumeParse(userId)
  return { content, rawText: combined }
}

export const personasService = { list, get, create, update, remove, parseResume }
