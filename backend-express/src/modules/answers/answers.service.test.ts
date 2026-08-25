import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AppError } from '@/shared/errors.js'

vi.mock('./answers.repository.js', () => ({
  answersRepository: {
    create: vi.fn(),
    listForUser: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    markUsed: vi.fn(),
    remove: vi.fn(),
  },
}))
vi.mock('@/modules/personas/personas.repository.js', () => ({ personasRepository: { findById: vi.fn() } }))
vi.mock('@/modules/jobs/jobs.repository.js', () => ({ jobsRepository: { findById: vi.fn() } }))
vi.mock('@/modules/ai/gemini.service.js', () => ({
  geminiService: { isAiEnabled: vi.fn(() => true), generateStructured: vi.fn() },
}))
vi.mock('@/modules/ai/ai.rate-limit.js', () => ({ assertWithinRateLimit: vi.fn() }))
vi.mock('@/modules/ai/ai-usage.repository.js', () => ({ aiUsageRepository: { recordUsageEvent: vi.fn() } }))
vi.mock('@/modules/ai/ai.prompts.js', () => ({
  buildAnswerPrompt: vi.fn(() => 'PROMPT'),
  AnswerDraftSchema: { parse: vi.fn() },
}))

import { answersRepository } from './answers.repository.js'
import { answersService } from './answers.service.js'
import { personasRepository } from '@/modules/personas/personas.repository.js'
import { jobsRepository } from '@/modules/jobs/jobs.repository.js'
import { geminiService } from '@/modules/ai/gemini.service.js'
import { assertWithinRateLimit } from '@/modules/ai/ai.rate-limit.js'
import { aiUsageRepository } from '@/modules/ai/ai-usage.repository.js'

const repo = vi.mocked(answersRepository)
const USER = 'user-1'
const ID = 'answer-1'

const row = {
  id: ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: USER,
  question: 'Why?',
  answerShort: 'Short.',
  answerLong: 'Long.',
  lastUsedAt: null,
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('answersService.create', () => {
  it('stores undefined variants as null', async () => {
    repo.create.mockResolvedValue(row)
    await answersService.create(USER, { question: 'Why?', answerShort: 'Short.' })
    expect(repo.create).toHaveBeenCalledWith({
      userId: USER,
      question: 'Why?',
      answerShort: 'Short.',
      answerLong: null,
    })
  })
})

describe('answersService.update', () => {
  it('rejects a patch that would leave the answer with no content', async () => {
    repo.findById.mockResolvedValue({ ...row, answerLong: null })
    await expect(answersService.update(USER, ID, { answerShort: '' })).rejects.toBeInstanceOf(AppError)
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('allows blanking one variant while the other stands', async () => {
    repo.findById.mockResolvedValue(row)
    repo.update.mockResolvedValue({ ...row, answerShort: null })
    await answersService.update(USER, ID, { answerShort: '' })
    expect(repo.update).toHaveBeenCalledWith(USER, ID, { answerShort: null })
  })

  it('throws NOT_FOUND for an answer the user does not own', async () => {
    repo.findById.mockResolvedValue(null)
    await expect(answersService.update(USER, ID, { question: 'New?' })).rejects.toBeInstanceOf(AppError)
  })
})

describe('answersService.markUsed', () => {
  it('returns the stamped id and timestamp', async () => {
    const stampedAt = new Date()
    repo.markUsed.mockResolvedValue({ ...row, lastUsedAt: stampedAt })
    expect(await answersService.markUsed(USER, ID)).toEqual({ id: ID, lastUsedAt: stampedAt })
  })

  it('throws NOT_FOUND when the row is not the user’s', async () => {
    repo.markUsed.mockResolvedValue(null)
    await expect(answersService.markUsed(USER, ID)).rejects.toBeInstanceOf(AppError)
  })
})

describe('answersService.remove', () => {
  it('throws NOT_FOUND when nothing was deleted', async () => {
    repo.remove.mockResolvedValue(false)
    await expect(answersService.remove(USER, ID)).rejects.toBeInstanceOf(AppError)
  })
})

const personas = vi.mocked(personasRepository)
const jobs = vi.mocked(jobsRepository)
const gemini = vi.mocked(geminiService)
const usage = vi.mocked(aiUsageRepository)

const PERSONA_ID = 'persona-1'
const persona = {
  id: PERSONA_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: USER,
  name: 'Backend',
  rawInput: null,
  data: { basics: { name: 'Ada', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] },
}

describe('answersService.generate', () => {
  beforeEach(() => {
    gemini.isAiEnabled.mockReturnValue(true)
    gemini.generateStructured.mockResolvedValue({ short: 'S', long: 'L' })
  })

  it('returns both variants without persisting anything', async () => {
    personas.findById.mockResolvedValue(persona)
    const draft = await answersService.generate(USER, { question: 'Why?', personaId: PERSONA_ID })
    expect(draft).toEqual({ short: 'S', long: 'L' })
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('refuses when AI is not configured', async () => {
    gemini.isAiEnabled.mockReturnValue(false)
    await expect(answersService.generate(USER, { question: 'Why?', personaId: PERSONA_ID })).rejects.toBeInstanceOf(AppError)
  })

  it('does not spend the rate limit when the persona is not the user\u2019s', async () => {
    personas.findById.mockResolvedValue(null)
    await expect(answersService.generate(USER, { question: 'Why?', personaId: PERSONA_ID })).rejects.toBeInstanceOf(AppError)
    expect(assertWithinRateLimit).not.toHaveBeenCalled()
  })

  it('does not spend the rate limit when the job is not the user\u2019s', async () => {
    personas.findById.mockResolvedValue(persona)
    jobs.findById.mockResolvedValue(null)
    await expect(
      answersService.generate(USER, { question: 'Why?', personaId: PERSONA_ID, jobId: 'job-1' }),
    ).rejects.toBeInstanceOf(AppError)
    expect(assertWithinRateLimit).not.toHaveBeenCalled()
  })

  it('records exactly one usage event, after a successful generation', async () => {
    personas.findById.mockResolvedValue(persona)
    await answersService.generate(USER, { question: 'Why?', personaId: PERSONA_ID })
    expect(usage.recordUsageEvent).toHaveBeenCalledTimes(1)
    expect(usage.recordUsageEvent).toHaveBeenCalledWith(USER, 'answer_generate')
  })

  it('records no usage event when the model call fails', async () => {
    personas.findById.mockResolvedValue(persona)
    gemini.generateStructured.mockRejectedValue(new AppError('INTERNAL_ERROR', 'boom'))
    await expect(answersService.generate(USER, { question: 'Why?', personaId: PERSONA_ID })).rejects.toBeInstanceOf(AppError)
    expect(usage.recordUsageEvent).not.toHaveBeenCalled()
  })
})
