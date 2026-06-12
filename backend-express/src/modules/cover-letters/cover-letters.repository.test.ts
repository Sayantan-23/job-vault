import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { jobs } from '@/db/schema/jobs.js'
import { coverLetters } from '@/db/schema/cover-letters.js'
import { coverLettersRepository } from './cover-letters.repository.js'

const EMAIL = `cl-repo-${Date.now()}@example.com`
let userId: string, jobId: string

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
})
afterAll(async () => {
  await getDb().delete(coverLetters).where(eq(coverLetters.userId, userId))
  await getDb().delete(jobs).where(eq(jobs.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('coverLettersRepository (real DB)', () => {
  it('creates, lists by job, finds, updates and removes (user-scoped)', async () => {
    const cl = await coverLettersRepository.create({ userId, jobId, personaId: null, title: 'T', instructions: null, bodyMarkdown: 'Dear hiring manager' })
    expect(cl.bodyMarkdown).toContain('Dear')
    expect(await coverLettersRepository.listForUser(userId, jobId)).toHaveLength(1)
    expect(await coverLettersRepository.findById(userId, cl.id)).not.toBeNull()
    expect(await coverLettersRepository.findById('00000000-0000-0000-0000-000000000000', cl.id)).toBeNull()
    const u = await coverLettersRepository.update(userId, cl.id, { bodyMarkdown: 'Updated' })
    expect(u?.bodyMarkdown).toBe('Updated')
    expect(await coverLettersRepository.remove(userId, cl.id)).toBe(true)
  })

  it('stores adhoc letters (jobId null + adhocJob jsonb) and lists them alongside tracked ones', async () => {
    const tracked = await coverLettersRepository.create({ userId, jobId, personaId: null, title: 'Tracked', instructions: null, bodyMarkdown: 'Tracked body' })
    const adhoc = await coverLettersRepository.create({
      userId,
      jobId: null,
      adhocJob: { title: 'Staff Eng', company: 'Acme', description: 'JD text' },
      personaId: null,
      title: 'Acme — cover letter',
      instructions: null,
      bodyMarkdown: 'Adhoc body',
    })
    const found = await coverLettersRepository.findById(userId, adhoc.id)
    expect(found?.jobId).toBeNull()
    expect(found?.adhocJob).toEqual({ title: 'Staff Eng', company: 'Acme', description: 'JD text' })
    const all = await coverLettersRepository.listForUser(userId)
    expect(all.map((l) => l.id).sort()).toEqual([tracked.id, adhoc.id].sort())
    const trackedOnly = await coverLettersRepository.listForUser(userId, jobId)
    expect(trackedOnly.map((l) => l.id)).toEqual([tracked.id])
  })

  it('rejects rows where both job_id and adhoc_job are null (XOR check)', async () => {
    await expect(
      getDb().insert(coverLetters).values({ userId, jobId: null, adhocJob: null, personaId: null, title: null, instructions: null, bodyMarkdown: 'x' }),
    ).rejects.toThrow()
  })
})
