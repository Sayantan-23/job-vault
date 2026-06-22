import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import request from 'supertest'
import type { Express } from 'express'

// apiKeyMiddleware authenticates via this; mock it to control the principal.
vi.mock('@/modules/api-keys/api-keys.service.js', () => ({
  apiKeysService: { verifyRawKey: vi.fn() },
}))
vi.mock('./extension.service.js', () => ({
  extensionService: { verifyKey: vi.fn(), checkUrl: vi.fn(), quickCreateJob: vi.fn(), scrape: vi.fn() },
}))

import { apiKeysService } from '@/modules/api-keys/api-keys.service.js'
import { extensionService } from './extension.service.js'

const auth = vi.mocked(apiKeysService)
const svc = vi.mocked(extensionService)

let app: Express
const KEY = 'jv_test'
beforeAll(async () => {
  process.env['NODE_ENV'] = 'test'
  process.env['PORT'] = '3000'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['DATABASE_URL'] = 'postgres://x:x@x:5432/x'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['JWT_ACCESS_EXPIRY'] = '15m'
  process.env['JWT_REFRESH_EXPIRY'] = '7d'
  process.env['LOG_LEVEL'] = 'silent'
  app = (await import('@/app.js')).createApp()
})
beforeEach(() => {
  vi.clearAllMocks()
  auth.verifyRawKey.mockResolvedValue({ id: 'k1', userId: 'u1' })
})

describe('extension routes', () => {
  it('401 without an X-API-Key header', async () => {
    expect((await request(app).post('/api/extension/verify-key')).status).toBe(401)
  })

  it('401 when the key is invalid', async () => {
    auth.verifyRawKey.mockResolvedValue(null)
    const res = await request(app).post('/api/extension/verify-key').set('X-API-Key', KEY)
    expect(res.status).toBe(401)
  })

  it('verify-key 200 returns the connected account', async () => {
    svc.verifyKey.mockResolvedValue({ ok: true, user: { email: 'a@b.c' } })
    const res = await request(app).post('/api/extension/verify-key').set('X-API-Key', KEY)
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual({ ok: true, user: { email: 'a@b.c' } })
    expect(svc.verifyKey).toHaveBeenCalledWith('u1')
  })

  it('check-url 200 with a valid url, 400 without one', async () => {
    svc.checkUrl.mockResolvedValue({ isDuplicate: false })
    const ok = await request(app).get('/api/extension/check-url').query({ url: 'https://x.com/j' }).set('X-API-Key', KEY)
    expect(ok.status).toBe(200)
    expect(svc.checkUrl).toHaveBeenCalledWith('u1', 'https://x.com/j')
    const bad = await request(app).get('/api/extension/check-url').query({ url: 'nope' }).set('X-API-Key', KEY)
    expect(bad.status).toBe(400)
  })

  it('POST /jobs 201 on a valid body, 400 without title', async () => {
    svc.quickCreateJob.mockResolvedValue({ id: 'j1', title: 'T', company: 'C', status: 'WISHLIST', isDuplicate: false })
    const ok = await request(app).post('/api/extension/jobs').set('X-API-Key', KEY).send({ title: 'T', company: 'C' })
    expect(ok.status).toBe(201)
    expect(ok.body.data.id).toBe('j1')
    const bad = await request(app).post('/api/extension/jobs').set('X-API-Key', KEY).send({ company: 'C' })
    expect(bad.status).toBe(400)
  })

  it('POST /scrape 200 on a valid url, 400 without one', async () => {
    svc.scrape.mockResolvedValue({
      title: 'T',
      company: 'C',
      snapshotMarkdown: 'md',
      status: 'ok',
      source: 'static',
    })
    const ok = await request(app).post('/api/extension/scrape').set('X-API-Key', KEY).send({ sourceUrl: 'https://x.com/j' })
    expect(ok.status).toBe(200)
    const bad = await request(app).post('/api/extension/scrape').set('X-API-Key', KEY).send({})
    expect(bad.status).toBe(400)
  })
})
