import { describe, it, expect, beforeAll } from 'vitest'
import express from 'express'
import request from 'supertest'
import { z } from 'zod'
import { AppError } from '@/shared/errors.js'

let app: express.Express

beforeAll(async () => {
  process.env['NODE_ENV'] = 'test'
  process.env['PORT'] = '3000'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['DATABASE_URL'] = 'postgres://x:x@x:5432/x'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['LOG_LEVEL'] = 'silent'
  const { errorHandler, notFoundHandler } = await import('./error.middleware.js')

  app = express()
  app.get('/app-error', () => {
    throw new AppError('NOT_FOUND', 'job missing')
  })
  app.get('/zod-error', () => {
    z.object({ a: z.string() }).parse({})
  })
  app.get('/raw-error', () => {
    throw new Error('boom')
  })
  app.use(notFoundHandler)
  app.use(errorHandler)
})

describe('errorHandler', () => {
  it('formats AppError with the correct status and envelope', async () => {
    const res = await request(app).get('/app-error')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({
      statusCode: 404,
      message: 'job missing',
      error: 'NOT_FOUND',
    })
  })

  it('formats ZodError as 400 VALIDATION_ERROR with details', async () => {
    const res = await request(app).get('/zod-error')
    expect(res.status).toBe(400)
    expect(res.body.statusCode).toBe(400)
    expect(res.body.error).toBe('VALIDATION_ERROR')
    expect(res.body.details).toBeDefined()
  })

  it('formats unknown errors as 500 INTERNAL_ERROR', async () => {
    const res = await request(app).get('/raw-error')
    expect(res.status).toBe(500)
    expect(res.body.error).toBe('INTERNAL_ERROR')
  })
})

describe('notFoundHandler', () => {
  it('returns 404 NOT_FOUND for unmatched routes', async () => {
    const res = await request(app).get('/this-route-does-not-exist')
    expect(res.status).toBe(404)
    expect(res.body).toEqual({
      statusCode: 404,
      message: 'Route not found',
      error: 'NOT_FOUND',
    })
  })
})
