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

import { answersRepository } from './answers.repository.js'
import { answersService } from './answers.service.js'

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
