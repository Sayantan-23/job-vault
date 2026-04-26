import { describe, it, expect, beforeAll } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

let app: Express

beforeAll(async () => {
  process.env['NODE_ENV'] = 'test'
  process.env['PORT'] = '3000'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['DATABASE_URL'] = 'postgres://x:x@x:5432/x'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['LOG_LEVEL'] = 'silent'
  const mod = await import('@/app.js')
  app = mod.createApp()
})

describe('GET /api/health', () => {
  it('returns 200 with status ok and a timestamp', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.data.status).toBe('ok')
    expect(typeof res.body.data.timestamp).toBe('string')
    expect(new Date(res.body.data.timestamp).toString()).not.toBe('Invalid Date')
  })

  it('sends a request ID header', async () => {
    const res = await request(app).get('/api/health')
    expect(res.headers['x-request-id']).toBeDefined()
  })
})

describe('CORS preflight', () => {
  it('responds to OPTIONS with the configured origin and credentials', async () => {
    const res = await request(app)
      .options('/api/health')
      .set('Origin', 'http://localhost:8080')
      .set('Access-Control-Request-Method', 'GET')
    expect(res.status).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:8080')
    expect(res.headers['access-control-allow-credentials']).toBe('true')
  })
})
