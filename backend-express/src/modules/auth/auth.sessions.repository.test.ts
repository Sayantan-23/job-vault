import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { authRepository } from './auth.repository.js'
import { sessionsRepository } from './auth.sessions.repository.js'

const EMAIL = `sessions-test-${Date.now()}@example.com`
const OTHER_EMAIL = `sessions-other-${Date.now()}@example.com`
const IN_A_WEEK = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

let userId: string
let otherUserId: string

beforeAll(async () => {
  // Real DB connection for this integration test; plus the other vars getEnv() requires.
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  }
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  userId = (await authRepository.create({ name: 'Sess', email: EMAIL, passwordHash: 'h' })).id
  otherUserId = (await authRepository.create({ name: 'Other', email: OTHER_EMAIL, passwordHash: 'h' })).id
})

afterAll(async () => {
  await getDb().delete(users).where(eq(users.email, EMAIL))
  await getDb().delete(users).where(eq(users.email, OTHER_EMAIL))
  await closeDb()
})

describe('sessionsRepository (real DB)', () => {
  it('keeps two concurrent sessions for one user and deletes them one at a time', async () => {
    const web = await sessionsRepository.create({
      userId, tokenHash: `web-${Date.now()}`, client: 'web', expiresAt: IN_A_WEEK(),
    })
    const native = await sessionsRepository.create({
      userId, tokenHash: `native-${Date.now()}`, client: 'native', expiresAt: IN_A_WEEK(),
    })

    const both = await sessionsRepository.listByUser(userId)
    expect(both.map((s) => s.id).sort()).toEqual([web.id, native.id].sort())

    await sessionsRepository.deleteById(userId, web.id)
    const left = await sessionsRepository.listByUser(userId)
    expect(left.map((s) => s.id)).toEqual([native.id])

    await sessionsRepository.deleteAllForUser(userId)
    expect(await sessionsRepository.listByUser(userId)).toHaveLength(0)
  })

  it('rotates a session in place, keeping the row and its created_at', async () => {
    const before = await sessionsRepository.create({
      userId, tokenHash: `rotate-a-${Date.now()}`, client: 'web', expiresAt: IN_A_WEEK(),
    })
    const nextHash = `rotate-b-${Date.now()}`
    const nextExpiry = new Date(Date.now() + 60_000)
    await sessionsRepository.rotate(userId, before.id, { tokenHash: nextHash, expiresAt: nextExpiry })

    const [after] = await sessionsRepository.listByUser(userId)
    expect(after?.id).toBe(before.id)
    expect(after?.tokenHash).toBe(nextHash)
    expect(after?.expiresAt.getTime()).toBe(nextExpiry.getTime())
    expect(after?.createdAt.getTime()).toBe(before.createdAt.getTime())
    expect(after?.lastUsedAt.getTime()).toBeGreaterThanOrEqual(before.lastUsedAt.getTime())
    await sessionsRepository.deleteAllForUser(userId)
  })

  it('scopes writes by user: another user cannot rotate or delete this session', async () => {
    const mine = await sessionsRepository.create({
      userId, tokenHash: `scoped-${Date.now()}`, client: 'web', expiresAt: IN_A_WEEK(),
    })
    await sessionsRepository.deleteById(otherUserId, mine.id)
    await sessionsRepository.rotate(otherUserId, mine.id, {
      tokenHash: `stolen-${Date.now()}`, expiresAt: IN_A_WEEK(),
    })

    const [still] = await sessionsRepository.listByUser(userId)
    expect(still?.id).toBe(mine.id)
    expect(still?.tokenHash).toBe(mine.tokenHash)
    await sessionsRepository.deleteAllForUser(userId)
  })

  it('cascades sessions away when the user is deleted', async () => {
    const email = `sessions-cascade-${Date.now()}@example.com`
    const doomed = await authRepository.create({ name: 'Doomed', email, passwordHash: 'h' })
    await sessionsRepository.create({
      userId: doomed.id, tokenHash: `cascade-${Date.now()}`, client: 'web', expiresAt: IN_A_WEEK(),
    })
    await getDb().delete(users).where(eq(users.id, doomed.id))
    expect(await sessionsRepository.listByUser(doomed.id)).toHaveLength(0)
  })
})
