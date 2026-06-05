import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { personas } from '@/db/schema/personas.js'
import { personasRepository } from './personas.repository.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

const EMAIL = `personas-repo-${Date.now()}@example.com`
let userId: string
const DATA: ResumeContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const rows = await getDb().insert(users).values({ name: 'P', email: EMAIL, passwordHash: 'h' }).returning()
  userId = rows[0]!.id
})

afterAll(async () => {
  await getDb().delete(personas).where(eq(personas.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('personasRepository (real DB)', () => {
  it('creates, counts, lists, finds, updates and removes user-scoped', async () => {
    const created = await personasRepository.create({ userId, name: 'Backend', data: DATA, rawInput: 'raw' })
    expect(created.name).toBe('Backend')
    expect(await personasRepository.countForUser(userId)).toBe(1)

    const list = await personasRepository.listForUser(userId)
    expect(list).toHaveLength(1)

    const found = await personasRepository.findById(userId, created.id)
    expect(found?.id).toBe(created.id)
    expect(await personasRepository.findById('00000000-0000-0000-0000-000000000000', created.id)).toBeNull()

    const updated = await personasRepository.update(userId, created.id, { name: 'Full-stack' })
    expect(updated?.name).toBe('Full-stack')

    expect(await personasRepository.remove(userId, created.id)).toBe(true)
    expect(await personasRepository.countForUser(userId)).toBe(0)
  })
})
