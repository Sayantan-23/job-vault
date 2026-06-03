import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { jobs } from '@/db/schema/jobs.js'
import { timelineEvents } from '@/db/schema/timeline.js'
import { timelineRepository } from './timeline.repository.js'

const EMAIL = `timeline-repo-${Date.now()}@example.com`
let userId: string
let jobId: string

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  }
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const userRows = await getDb()
    .insert(users)
    .values({ name: 'Repo', email: EMAIL, passwordHash: 'h' })
    .returning()
  const user = userRows[0]
  if (!user) throw new Error('failed to seed user')
  userId = user.id
  const jobRows = await getDb()
    .insert(jobs)
    .values({ userId, title: 'SWE', company: 'Acme', status: 'WISHLIST', kanbanOrder: 1, lastActivityAt: new Date() })
    .returning()
  const job = jobRows[0]
  if (!job) throw new Error('failed to seed job')
  jobId = job.id
})

afterAll(async () => {
  await getDb().delete(timelineEvents).where(eq(timelineEvents.userId, userId))
  await getDb().delete(jobs).where(eq(jobs.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('timelineRepository (real DB)', () => {
  it('creates an event and returns the row', async () => {
    const row = await timelineRepository.create({
      userId,
      jobId,
      type: 'MANUAL',
      title: 'Called the recruiter',
      description: 'Left a voicemail',
    })
    expect(row.id).toBeTruthy()
    expect(row.type).toBe('MANUAL')
    expect(row.title).toBe('Called the recruiter')
    expect(row.description).toBe('Left a voicemail')
  })

  it('lists a job’s events newest-first, scoped to the job', async () => {
    const first = await timelineRepository.create({ userId, jobId, type: 'AUTO', title: 'first' })
    const second = await timelineRepository.create({ userId, jobId, type: 'AUTO', title: 'second' })
    const rows = await timelineRepository.findByJob(jobId)
    const firstIdx = rows.findIndex((r) => r.id === first.id)
    const secondIdx = rows.findIndex((r) => r.id === second.id)
    expect(secondIdx).toBeLessThan(firstIdx)
    expect(rows.every((r) => r.jobId === jobId)).toBe(true)
  })
})
