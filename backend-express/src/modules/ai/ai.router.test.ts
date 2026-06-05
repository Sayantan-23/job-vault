import { describe, it, expect, beforeAll, vi } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

let app: Express

beforeAll(async () => {
  process.env['NODE_ENV'] = 'test'
  process.env['PORT'] = '3000'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['DATABASE_URL'] = 'postgres://x:x@x:5432/x'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['JWT_ACCESS_EXPIRY'] = '15m'
  process.env['JWT_REFRESH_EXPIRY'] = '7d'
  process.env['LOG_LEVEL'] = 'silent'
  process.env['MAX_PERSONAS'] = '5'
  delete process.env['GEMINI_API_KEY']
  app = (await import('@/app.js')).createApp()
})

describe('GET /api/ai/status', () => {
  it('reports disabled with the persona cap when no key is set', async () => {
    const res = await request(app).get('/api/ai/status')
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ enabled: false, maxPersonas: 5 })
  })

  it('reports enabled with the persona cap when a key is set', async () => {
    vi.resetModules()
    process.env['GEMINI_API_KEY'] = 'test-key'
    const enabledApp = (await import('@/app.js')).createApp()
    const res = await request(enabledApp).get('/api/ai/status')
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ enabled: true, maxPersonas: 5 })
    delete process.env['GEMINI_API_KEY']
    vi.resetModules()
  })
})
