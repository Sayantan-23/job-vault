import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { authRepository } from './auth.repository.js'
import { sessionsRepository } from './auth.sessions.repository.js'
import { userSessions } from '@/db/schema/user-sessions.js'

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

  it('rotates a session in place, keeping the row, its created_at and its expiry cap', async () => {
    const before = await sessionsRepository.create({
      userId, tokenHash: `rotate-a-${Date.now()}`, client: 'web', expiresAt: IN_A_WEEK(),
    })
    const nextHash = `rotate-b-${Date.now()}`
    const rotated = await sessionsRepository.rotate(userId, before.id, {
      tokenHash: nextHash, previousTokenHash: before.tokenHash,
    })
    expect(rotated?.tokenHash).toBe(nextHash)

    const [after] = await sessionsRepository.listByUser(userId)
    expect(after?.id).toBe(before.id)
    expect(after?.tokenHash).toBe(nextHash)
    expect(after?.previousTokenHash).toBe(before.tokenHash)
    expect(after?.rotatedAt).not.toBeNull()
    expect(after?.createdAt.getTime()).toBe(before.createdAt.getTime())
    // Absolute cap: rotation must not slide it.
    expect(after?.expiresAt.getTime()).toBe(before.expiresAt.getTime())
    expect(after?.updatedAt.getTime()).toBeGreaterThanOrEqual(before.updatedAt.getTime())
    await sessionsRepository.deleteAllForUser(userId)
  })

  // Compare-and-swap on the first arm; everyone else lands on the grace arm and
  // gets the row back untouched, so the winner's token is never demoted.
  it('rotates once for the current token and serves the rest from the grace arm', async () => {
    const start = `cas-start-${Date.now()}`
    const session = await sessionsRepository.create({
      userId, tokenHash: start, client: 'web', expiresAt: IN_A_WEEK(),
    })
    const winnerHash = `cas-winner-${Date.now()}`
    const winner = await sessionsRepository.rotate(userId, session.id, {
      tokenHash: winnerHash, previousTokenHash: start,
    })
    const loserA = await sessionsRepository.rotate(userId, session.id, {
      tokenHash: `cas-loser-a-${Date.now()}`, previousTokenHash: start,
    })
    const loserB = await sessionsRepository.rotate(userId, session.id, {
      tokenHash: `cas-loser-b-${Date.now()}`, previousTokenHash: start,
    })

    expect(winner?.tokenHash).toBe(winnerHash)
    // Both losers matched (no 401) but neither moved the row.
    expect(loserA?.tokenHash).toBe(winnerHash)
    expect(loserB?.tokenHash).toBe(winnerHash)
    expect(loserB?.previousTokenHash).toBe(start)
    expect(loserB?.rotatedAt?.getTime()).toBe(winner?.rotatedAt?.getTime())
    expect((await sessionsRepository.listByUser(userId))[0]?.tokenHash).toBe(winnerHash)
    await sessionsRepository.deleteAllForUser(userId)
  })

  it('refuses the previous token once the grace window has closed', async () => {
    const start = `grace-start-${Date.now()}`
    const session = await sessionsRepository.create({
      userId, tokenHash: start, client: 'web', expiresAt: IN_A_WEEK(),
    })
    await sessionsRepository.rotate(userId, session.id, {
      tokenHash: `grace-next-${Date.now()}`, previousTokenHash: start,
    })
    await getDb()
      .update(userSessions)
      .set({ rotatedAt: new Date(Date.now() - 60_000) })
      .where(eq(userSessions.id, session.id))

    expect(
      await sessionsRepository.rotate(userId, session.id, {
        tokenHash: `grace-late-${Date.now()}`, previousTokenHash: start,
      }),
    ).toBeNull()
    await sessionsRepository.deleteAllForUser(userId)
  })

  it('hides sessions past their cap and reaps them', async () => {
    const live = await sessionsRepository.create({
      userId, tokenHash: `live-${Date.now()}`, client: 'web', expiresAt: IN_A_WEEK(),
    })
    const dead = await sessionsRepository.create({
      userId, tokenHash: `dead-${Date.now()}`, client: 'web',
      expiresAt: new Date(Date.now() - 1000),
    })
    expect((await sessionsRepository.listByUser(userId)).map((s) => s.id)).toEqual([live.id])
    // Past its cap, the row cannot be rotated either — the statement carries the
    // expiry predicate itself, it does not rely on the caller having filtered.
    expect(
      await sessionsRepository.rotate(userId, dead.id, {
        tokenHash: `x-${Date.now()}`, previousTokenHash: dead.tokenHash,
      }),
    ).toBeNull()

    expect(await sessionsRepository.deleteExpired()).toBeGreaterThanOrEqual(1)
    expect((await sessionsRepository.listByUser(userId)).map((s) => s.id)).toEqual([live.id])
    await sessionsRepository.deleteAllForUser(userId)
  })

  it('scopes writes by user: another user cannot rotate or delete this session', async () => {
    const mine = await sessionsRepository.create({
      userId, tokenHash: `scoped-${Date.now()}`, client: 'web', expiresAt: IN_A_WEEK(),
    })
    await sessionsRepository.deleteById(otherUserId, mine.id)
    const stolen = await sessionsRepository.rotate(otherUserId, mine.id, {
      tokenHash: `stolen-${Date.now()}`, previousTokenHash: mine.tokenHash,
    })
    expect(stolen).toBeNull()

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
