import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { apiKeys } from '@/db/schema/api-keys.js'
import { apiKeysRepository } from './api-keys.repository.js'

const EMAIL = `apikeys-repo-${Date.now()}@example.com`
let userId = ''

beforeAll(async () => {
  if (!process.env['DATABASE_URL'])
    process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const rows = await getDb().insert(users).values({ name: 'U', email: EMAIL, passwordHash: 'h' }).returning()
  const userRow = rows[0]
  if (!userRow) throw new Error('failed to seed user')
  userId = userRow.id
})
afterAll(async () => {
  await getDb().delete(apiKeys).where(eq(apiKeys.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('apiKeysRepository (real DB)', () => {
  it('creates, lists active, finds by prefix, touches last-used, and soft-revokes', async () => {
    const k = await apiKeysRepository.create({ userId, name: 'Chrome', keyPrefix: 'jv_abcd1234', keyHash: 'hash1' })
    expect(k.revokedAt).toBeNull()
    expect(await apiKeysRepository.listActiveForUser(userId)).toHaveLength(1)

    const byPrefix = await apiKeysRepository.findActiveByPrefix('jv_abcd1234')
    expect(byPrefix.map((r) => r.id)).toContain(k.id)

    await apiKeysRepository.touchLastUsed(k.id)
    const touched = await apiKeysRepository.findActiveByPrefix('jv_abcd1234')
    expect(touched[0]?.lastUsedAt).not.toBeNull()

    expect(await apiKeysRepository.revoke(userId, k.id)).toBe(true)
    expect(await apiKeysRepository.revoke(userId, k.id)).toBe(false) // already revoked
    expect(await apiKeysRepository.listActiveForUser(userId)).toHaveLength(0)
    expect(await apiKeysRepository.findActiveByPrefix('jv_abcd1234')).toHaveLength(0) // revoked excluded
  })

  it('excludes expired keys from findActiveByPrefix', async () => {
    await apiKeysRepository.create({
      userId,
      name: 'Expired',
      keyPrefix: 'jv_expired0',
      keyHash: 'h',
      expiresAt: new Date(Date.now() - 60_000),
    })
    expect(await apiKeysRepository.findActiveByPrefix('jv_expired0')).toHaveLength(0)
  })

  it('scopes revoke to the owner', async () => {
    const k = await apiKeysRepository.create({ userId, name: 'Scoped', keyPrefix: 'jv_scoped00', keyHash: 'h' })
    expect(await apiKeysRepository.revoke('00000000-0000-0000-0000-000000000000', k.id)).toBe(false)
    expect(await apiKeysRepository.revoke(userId, k.id)).toBe(true)
  })
})
