import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq, inArray } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { deviceTokens } from '@/db/schema/device-tokens.js'
import { pushRepository } from './push.repository.js'

const STAMP = Date.now()
const TOKEN = `ExponentPushToken[repo-${STAMP}]`
let userId: string
let otherUserId: string

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  }
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const rows = await getDb()
    .insert(users)
    .values([
      { name: 'Push A', email: `push-a-${STAMP}@example.com`, passwordHash: 'h' },
      { name: 'Push B', email: `push-b-${STAMP}@example.com`, passwordHash: 'h' },
    ])
    .returning()
  const [a, b] = rows
  if (!a || !b) throw new Error('failed to seed users')
  userId = a.id
  otherUserId = b.id
})

afterAll(async () => {
  await getDb().delete(users).where(inArray(users.id, [userId, otherUserId]))
  await closeDb()
})

describe('pushRepository (real DB)', () => {
  it('registers a device and lists it for its owner only', async () => {
    const row = await pushRepository.upsert({ userId, token: TOKEN, platform: 'android' })
    expect(row.token).toBe(TOKEN)
    expect(await pushRepository.listForUser(userId)).toHaveLength(1)
    expect(await pushRepository.listForUser(otherUserId)).toHaveLength(0)
  })

  it('moves the token to the new owner instead of duplicating it', async () => {
    await pushRepository.upsert({ userId: otherUserId, token: TOKEN, platform: 'ios' })
    const all = await getDb().select().from(deviceTokens).where(eq(deviceTokens.token, TOKEN))
    expect(all).toHaveLength(1)
    expect(all[0]?.userId).toBe(otherUserId)
    expect(all[0]?.platform).toBe('ios')
    expect(await pushRepository.listForUser(userId)).toHaveLength(0)
  })

  it('deletes only tokens the caller owns', async () => {
    expect(await pushRepository.remove(userId, TOKEN)).toBe(false)
    expect(await pushRepository.remove(otherUserId, TOKEN)).toBe(true)
    expect(await pushRepository.listForUser(otherUserId)).toHaveLength(0)
  })

  it('prunes dead tokens across users and no-ops on an empty list', async () => {
    await pushRepository.upsert({ userId, token: TOKEN, platform: 'android' })
    await pushRepository.removeTokens([])
    expect(await pushRepository.listForUser(userId)).toHaveLength(1)
    await pushRepository.removeTokens([TOKEN])
    expect(await pushRepository.listForUser(userId)).toHaveLength(0)
  })

  it('drops a user’s devices when the user is deleted', async () => {
    await pushRepository.upsert({ userId, token: TOKEN, platform: 'android' })
    await getDb().delete(users).where(eq(users.id, userId))
    const all = await getDb().select().from(deviceTokens).where(eq(deviceTokens.token, TOKEN))
    expect(all).toHaveLength(0)
  })
})
