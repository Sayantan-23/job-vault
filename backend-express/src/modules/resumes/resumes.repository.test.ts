import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { personas } from '@/db/schema/personas.js'
import { generatedResumes } from '@/db/schema/generated-resumes.js'
import { resumesRepository } from './resumes.repository.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'
import type { ProfileContent } from '@/shared/profile-content.schema.js'

const EMAIL = `resumes-repo-${Date.now()}@example.com`
let userId: string
let personaId: string
const C: ResumeContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
const P: ProfileContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const userRows = await getDb().insert(users).values({ name: 'R', email: EMAIL, passwordHash: 'h' }).returning()
  const userRow = userRows[0]
  if (!userRow) throw new Error('failed to seed user')
  userId = userRow.id
  const personaRows = await getDb().insert(personas).values({ userId, name: 'Backend', data: P }).returning()
  const personaRow = personaRows[0]
  if (!personaRow) throw new Error('failed to seed persona')
  personaId = personaRow.id
})
afterAll(async () => {
  await getDb().delete(generatedResumes).where(eq(generatedResumes.userId, userId))
  await getDb().delete(personas).where(eq(personas.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('resumesRepository (real DB)', () => {
  it('creates, lists, finds, updates and removes (user-scoped)', async () => {
    const r = await resumesRepository.create({ userId, personaId, jobId: null, title: 'T', instructions: null, content: C })
    expect(r.title).toBe('T')
    expect(await resumesRepository.listForUser(userId)).toHaveLength(1)
    expect(await resumesRepository.findById(userId, r.id)).not.toBeNull()
    expect(await resumesRepository.findById('00000000-0000-0000-0000-000000000000', r.id)).toBeNull()
    const u = await resumesRepository.update(userId, r.id, { title: 'T2' })
    expect(u?.title).toBe('T2')
    expect(await resumesRepository.remove(userId, r.id)).toBe(true)
  })
})
