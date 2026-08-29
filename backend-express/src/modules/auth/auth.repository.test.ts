import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { authRepository } from './auth.repository.js'

const EMAIL = `repo-test-${Date.now()}@example.com`

beforeAll(() => {
  // Real DB connection for this integration test; plus the other vars getEnv() requires.
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  }
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
})

afterAll(async () => {
  await getDb().delete(users).where(eq(users.email, EMAIL))
  await closeDb()
})

describe('authRepository (real DB)', () => {
  it('creates and finds by email and id', async () => {
    const created = await authRepository.create({ name: 'Repo', email: EMAIL, passwordHash: 'h' })
    expect(created.id).toBeTruthy()

    const byEmail = await authRepository.findByEmail(EMAIL)
    expect(byEmail?.id).toBe(created.id)

    const byId = await authRepository.findById(created.id)
    expect(byId?.email).toBe(EMAIL)
  })

  it('returns null for an unknown email', async () => {
    expect(await authRepository.findByEmail('nobody@example.com')).toBeNull()
  })
})
