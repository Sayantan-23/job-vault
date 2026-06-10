import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { inArray } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { ProfileContentSchema } from '@/shared/profile-content.schema.js'
import { profileRepository } from './profile.repository.js'

const EMAIL = `profile-repo-${Date.now()}@example.com`
let userId: string

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const u = (await getDb().insert(users).values({ name: 'P', email: EMAIL, passwordHash: 'h' }).returning())[0]
  if (!u) throw new Error('failed to seed user')
  userId = u.id
})

afterAll(async () => {
  await getDb().delete(users).where(inArray(users.id, [userId])) // cascade removes the profile
  await closeDb()
})

describe('profileRepository (real DB)', () => {
  it('returns null before any profile is saved', async () => {
    expect(await profileRepository.findByUserId(userId)).toBeNull()
  })

  it('upserts: inserts then updates the same row', async () => {
    const first = ProfileContentSchema.parse({ basics: { name: 'Ada' }, summary: 'first' })
    const a = await profileRepository.upsert(userId, first)
    expect(a.content.summary).toBe('first')

    const second = ProfileContentSchema.parse({ basics: { name: 'Ada' }, summary: 'second' })
    const b = await profileRepository.upsert(userId, second)
    expect(b.id).toBe(a.id) // same row
    expect(b.content.summary).toBe('second')

    const found = await profileRepository.findByUserId(userId)
    expect(found?.content.summary).toBe('second')
  })
})
