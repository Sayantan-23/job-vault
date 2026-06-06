import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { jobs } from '@/db/schema/jobs.js'
import { personas } from '@/db/schema/personas.js'
import { generatedResumes } from '@/db/schema/generated-resumes.js'
import { coverLetters } from '@/db/schema/cover-letters.js'
import { aiUsageRepository } from './ai-usage.repository.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

const EMAIL = `ai-usage-${Date.now()}@example.com`
let userId: string, jobId: string, personaId: string
const C: ResumeContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const userRows = await getDb().insert(users).values({ name: 'U', email: EMAIL, passwordHash: 'h' }).returning()
  const userRow = userRows[0]
  if (!userRow) throw new Error('failed to seed user')
  userId = userRow.id
  const jobRows = await getDb().insert(jobs).values({ userId, title: 'T', company: 'C', status: 'APPLIED', kanbanOrder: 1, lastActivityAt: new Date() }).returning()
  const jobRow = jobRows[0]
  if (!jobRow) throw new Error('failed to seed job')
  jobId = jobRow.id
  const personaRows = await getDb().insert(personas).values({ userId, name: 'P', data: C }).returning()
  const personaRow = personaRows[0]
  if (!personaRow) throw new Error('failed to seed persona')
  personaId = personaRow.id
})
afterAll(async () => {
  await getDb().delete(coverLetters).where(eq(coverLetters.userId, userId))
  await getDb().delete(generatedResumes).where(eq(generatedResumes.userId, userId))
  await getDb().delete(personas).where(eq(personas.userId, userId))
  await getDb().delete(jobs).where(eq(jobs.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('aiUsageRepository.countRecentGenerations (real DB)', () => {
  it('sums résumés + cover letters since the cutoff', async () => {
    const since = new Date(Date.now() - 60 * 60 * 1000)
    await getDb().insert(generatedResumes).values({ userId, personaId, jobId: null, content: C })
    await getDb().insert(coverLetters).values({ userId, jobId, personaId, bodyMarkdown: 'Dear…' })
    expect(await aiUsageRepository.countRecentGenerations(userId, since)).toBe(2)
    expect(await aiUsageRepository.countRecentGenerations(userId, new Date(Date.now() + 60_000))).toBe(0)
  })
})
