import { describe, it, expect, vi, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { AppError } from '@/shared/errors.js'
import type { QuestionAnswerRow } from '@/db/schema/question-answers.js'

vi.mock('@/middleware/auth.middleware.js', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.user = { id: 'user-1', email: 'u@example.com' }
    next()
  },
}))
vi.mock('./answers.service.js', () => ({
  answersService: {
    create: vi.fn(),
    list: vi.fn(),
    update: vi.fn(),
    markUsed: vi.fn(),
    remove: vi.fn(),
    generate: vi.fn(),
  },
}))

import { answersService } from './answers.service.js'
import { answersRouter } from './answers.router.js'
import { errorHandler } from '@/middleware/error.middleware.js'

const service = vi.mocked(answersService)

function app() {
  const a = express()
  a.use(express.json())
  a.use('/api/answers', answersRouter)
  a.use(errorHandler)
  return a
}

const UUID = '11111111-1111-4111-8111-111111111111'

const row: QuestionAnswerRow = {
  id: 'a1',
  createdAt: new Date(),
  updatedAt: new Date(),
  userId: 'user-1',
  question: 'Why?',
  answerShort: 'Because.',
  answerLong: null,
  lastUsedAt: null,
}

beforeEach(() => vi.resetAllMocks())

describe('answers router', () => {
  it('GET / returns the list in a data envelope', async () => {
    service.list.mockResolvedValue([])
    const res = await request(app()).get('/api/answers')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ data: [] })
  })

  it('POST / creates and returns 201', async () => {
    service.create.mockResolvedValue(row)
    const res = await request(app()).post('/api/answers').send({ question: 'Why?', answerShort: 'Because.' })
    expect(res.status).toBe(201)
    expect(service.create).toHaveBeenCalledWith('user-1', expect.objectContaining({ question: 'Why?' }))
  })

  it('POST / rejects a body with no variant', async () => {
    const res = await request(app()).post('/api/answers').send({ question: 'Why?' })
    expect(res.status).toBe(400)
    expect(service.create).not.toHaveBeenCalled()
  })

  it('PATCH /:id updates', async () => {
    service.update.mockResolvedValue(row)
    const res = await request(app()).patch('/api/answers/a1').send({ answerLong: 'Longer.' })
    expect(res.status).toBe(200)
    expect(service.update).toHaveBeenCalledWith('user-1', 'a1', { answerLong: 'Longer.' })
  })

  it('DELETE /:id returns 204', async () => {
    service.remove.mockResolvedValue({ id: 'a1' })
    const res = await request(app()).delete('/api/answers/a1')
    expect(res.status).toBe(204)
  })

  it('POST /:id/used stamps and returns the timestamp', async () => {
    const lastUsedAt = new Date()
    service.markUsed.mockResolvedValue({ id: 'a1', lastUsedAt })
    const res = await request(app()).post('/api/answers/a1/used')
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe('a1')
  })

  it('POST /generate returns the draft without a 201', async () => {
    service.generate.mockResolvedValue({ short: 'S', long: 'L' })
    const res = await request(app()).post('/api/answers/generate').send({ question: 'Why?', personaId: UUID })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ data: { short: 'S', long: 'L' } })
  })

  it('POST /generate surfaces a service AppError as its mapped status', async () => {
    service.generate.mockRejectedValue(new AppError('NOT_FOUND', 'Persona not found'))
    const res = await request(app()).post('/api/answers/generate').send({ question: 'Why?', personaId: UUID })
    expect(res.status).toBe(404)
  })
})
