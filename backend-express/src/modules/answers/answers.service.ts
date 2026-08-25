import { AppError } from '@/shared/errors.js'
import { answersRepository } from './answers.repository.js'
import type { QuestionAnswerRow } from '@/db/schema/question-answers.js'
import type { CreateAnswerInput, UpdateAnswerInput } from './answers.schema.js'

// An empty string from a patch means "clear this variant"; the column is
// nullable, so it is stored as NULL rather than ''.
function toStored(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined
  return value.trim() === '' ? null : value
}

function hasContent(value: string | null | undefined): boolean {
  return (value ?? '').trim().length > 0
}

async function create(userId: string, input: CreateAnswerInput): Promise<QuestionAnswerRow> {
  return answersRepository.create({
    userId,
    question: input.question,
    answerShort: toStored(input.answerShort) ?? null,
    answerLong: toStored(input.answerLong) ?? null,
  })
}

async function list(userId: string): Promise<QuestionAnswerRow[]> {
  return answersRepository.listForUser(userId)
}

// The at-least-one-variant rule cannot live in UpdateAnswerSchema: a patch that
// blanks one variant is legal when the other stands, and only the merged row
// knows that. So it is checked here, against the stored row plus the patch.
async function update(userId: string, id: string, input: UpdateAnswerInput): Promise<QuestionAnswerRow> {
  const existing = await answersRepository.findById(userId, id)
  if (!existing) throw new AppError('NOT_FOUND', 'Answer not found')

  const patch: { question?: string; answerShort?: string | null; answerLong?: string | null } = {}
  if (input.question !== undefined) patch.question = input.question
  const short = toStored(input.answerShort)
  const long = toStored(input.answerLong)
  if (short !== undefined) patch.answerShort = short
  if (long !== undefined) patch.answerLong = long

  const mergedShort = short !== undefined ? short : existing.answerShort
  const mergedLong = long !== undefined ? long : existing.answerLong
  if (!hasContent(mergedShort) && !hasContent(mergedLong)) {
    throw new AppError('VALIDATION_ERROR', 'An answer needs at least a short or a long version')
  }

  const updated = await answersRepository.update(userId, id, patch)
  if (!updated) throw new AppError('NOT_FOUND', 'Answer not found')
  return updated
}

// Stamped when the user copies a variant. Returns only the fields the client
// needs so a copy can never be mistaken for a full refresh of the row.
async function markUsed(userId: string, id: string): Promise<{ id: string; lastUsedAt: Date | null }> {
  const stamped = await answersRepository.markUsed(userId, id)
  if (!stamped) throw new AppError('NOT_FOUND', 'Answer not found')
  return { id: stamped.id, lastUsedAt: stamped.lastUsedAt }
}

async function remove(userId: string, id: string): Promise<{ id: string }> {
  const ok = await answersRepository.remove(userId, id)
  if (!ok) throw new AppError('NOT_FOUND', 'Answer not found')
  return { id }
}

export const answersService = { create, list, update, markUsed, remove }
