import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./ai-usage.repository.js', () => ({ aiUsageRepository: { countRecentGenerations: vi.fn() } }))
import { aiUsageRepository } from './ai-usage.repository.js'
import { assertWithinRateLimit } from './ai.rate-limit.js'

const usage = vi.mocked(aiUsageRepository)
beforeEach(() => {
  vi.clearAllMocks()
  process.env['DATABASE_URL'] = 'postgres://u:p@localhost:5432/db'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['AI_RATE_LIMIT_PER_HOUR'] = '2'
})

describe('assertWithinRateLimit', () => {
  it('passes under the limit', async () => {
    usage.countRecentGenerations.mockResolvedValue(1)
    await expect(assertWithinRateLimit('u1')).resolves.toBeUndefined()
  })
  it('throws RATE_LIMITED at/over the limit', async () => {
    usage.countRecentGenerations.mockResolvedValue(2)
    await expect(assertWithinRateLimit('u1')).rejects.toMatchObject({ code: 'RATE_LIMITED' })
  })
})
