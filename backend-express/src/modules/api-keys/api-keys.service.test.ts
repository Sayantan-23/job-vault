import { describe, it, expect, vi, beforeEach } from 'vitest'

// Set before the static imports below: logger.ts calls getEnv() at import time,
// so a beforeAll() would be too late (imports run during collection).
vi.hoisted(() => {
  process.env['DATABASE_URL'] = 'postgres://x:x@x:5432/x'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['LOG_LEVEL'] = 'silent'
})

vi.mock('./api-keys.repository.js', () => ({
  apiKeysRepository: {
    create: vi.fn(),
    listActiveForUser: vi.fn(),
    findActiveByPrefix: vi.fn(),
    revoke: vi.fn(),
    touchLastUsed: vi.fn(),
  },
}))

import { apiKeysRepository } from './api-keys.repository.js'
import { apiKeysService } from './api-keys.service.js'
import { hashSecret } from '@/modules/auth/auth.tokens.js'
import type { ApiKeyRow, NewApiKeyRow } from '@/db/schema/api-keys.js'

const repo = vi.mocked(apiKeysRepository)
const asType = <T>(value: unknown): T => value as T
function row(over: Partial<ApiKeyRow> = {}): ApiKeyRow {
  return asType<ApiKeyRow>({
    id: 'k1',
    userId: 'u1',
    name: 'Chrome',
    keyPrefix: 'jv_00000000',
    keyHash: 'h',
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  repo.touchLastUsed.mockResolvedValue(undefined)
})

describe('apiKeysService', () => {
  it('createKey returns a jv_ rawKey and stores only a bcrypt hash (never the raw)', async () => {
    let stored: NewApiKeyRow | undefined
    repo.create.mockImplementation((v: NewApiKeyRow) => {
      stored = v
      return Promise.resolve(row({ keyPrefix: v.keyPrefix, keyHash: v.keyHash }))
    })
    const created = await apiKeysService.createKey('u1', 'Chrome')
    expect(created.rawKey).toMatch(/^jv_[0-9a-f]{48}$/)
    expect(created.keyPrefix).toBe(created.rawKey.slice(0, 11))
    expect(stored?.keyHash).not.toBe(created.rawKey) // hashed, not the plaintext
    expect(stored?.keyHash).not.toContain(created.rawKey)
  })

  it('verifyRawKey returns the owner for a matching key and stamps last-used', async () => {
    let stored: NewApiKeyRow | undefined
    repo.create.mockImplementation((v: NewApiKeyRow) => {
      stored = v
      return Promise.resolve(row({ id: 'k9', userId: 'u9', keyPrefix: v.keyPrefix, keyHash: v.keyHash }))
    })
    const created = await apiKeysService.createKey('u9', 'Chrome')
    repo.findActiveByPrefix.mockResolvedValue([
      row({ id: 'k9', userId: 'u9', keyPrefix: created.keyPrefix, keyHash: stored?.keyHash ?? '' }),
    ])
    expect(await apiKeysService.verifyRawKey(created.rawKey)).toEqual({ id: 'k9', userId: 'u9' })
    expect(repo.touchLastUsed).toHaveBeenCalledWith('k9')
  })

  it('verifyRawKey returns null for malformed keys or when no candidates match', async () => {
    repo.findActiveByPrefix.mockResolvedValue([])
    expect(await apiKeysService.verifyRawKey('not-a-key')).toBeNull()
    expect(await apiKeysService.verifyRawKey(`jv_${'a'.repeat(48)}`)).toBeNull()
  })

  it('verifyRawKey returns null when the prefix matches but the secret differs', async () => {
    const otherHash = await hashSecret(`jv_${'b'.repeat(48)}`)
    repo.findActiveByPrefix.mockResolvedValue([row({ keyHash: otherHash })])
    expect(await apiKeysService.verifyRawKey(`jv_${'c'.repeat(48)}`)).toBeNull()
  })

  it('revoke throws NOT_FOUND when nothing was revoked', async () => {
    repo.revoke.mockResolvedValue(false)
    await expect(apiKeysService.revoke('u1', 'missing')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('list maps rows to the public, secret-free shape', async () => {
    repo.listActiveForUser.mockResolvedValue([row({ keyHash: 'SECRET' })])
    const list = await apiKeysService.list('u1')
    expect(list[0]).not.toHaveProperty('keyHash')
    expect(list[0]?.keyPrefix).toBe('jv_00000000')
  })
})
