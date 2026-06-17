import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { jobs } from '@/db/schema/jobs.js'
import { timelineEvents } from '@/db/schema/timeline.js'
import { timelineRepository } from './timeline.repository.js'

const EMAIL = `timeline-repo-${Date.now()}@example.com`
const OTHER_EMAIL = `timeline-repo-other-${Date.now()}@example.com`
let userId: string
let jobId: string
let otherUserId: string

async function seedUser(email: string): Promise<string> {
  const rows = await getDb().insert(users).values({ name: 'Repo', email, passwordHash: 'h' }).returning()
  const user = rows[0]
  if (!user) throw new Error('failed to seed user')
  return user.id
}

async function seedJob(ownerId: string, title: string, company: string): Promise<string> {
  const rows = await getDb()
    .insert(jobs)
    .values({ userId: ownerId, title, company, status: 'WISHLIST', kanbanOrder: 1, lastActivityAt: new Date() })
    .returning()
  const job = rows[0]
  if (!job) throw new Error('failed to seed job')
  return job.id
}

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  }
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  userId = await seedUser(EMAIL)
  jobId = await seedJob(userId, 'SWE', 'Acme')
  // A second user whose events must never leak into the first user's global feed.
  otherUserId = await seedUser(OTHER_EMAIL)
})

afterAll(async () => {
  for (const id of [userId, otherUserId]) {
    await getDb().delete(timelineEvents).where(eq(timelineEvents.userId, id))
    await getDb().delete(jobs).where(eq(jobs.userId, id))
    await getDb().delete(users).where(eq(users.id, id))
  }
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

describe('timelineRepository.findByUser (real DB)', () => {
  it('returns the user’s events enriched with job title + company, newest-first', async () => {
    const second = await seedJob(userId, 'PM', 'Globex')
    const a = await timelineRepository.create({ userId, jobId, type: 'AUTO', title: 'older' })
    const b = await timelineRepository.create({ userId, jobId: second, type: 'MANUAL', title: 'newer' })

    const { rows, total } = await timelineRepository.findByUser(userId, 100, 0)

    expect(total).toBe(rows.length)
    expect(rows.every((r) => r.userId === userId)).toBe(true)
    // Every row carries its job's title + company (the join populated them).
    expect(rows.every((r) => typeof r.jobTitle === 'string' && typeof r.jobCompany === 'string')).toBe(true)
    const newerIdx = rows.findIndex((r) => r.id === b.id)
    const olderIdx = rows.findIndex((r) => r.id === a.id)
    expect(newerIdx).toBeGreaterThanOrEqual(0)
    expect(rows[newerIdx]?.jobTitle).toBe('PM')
    expect(rows[newerIdx]?.jobCompany).toBe('Globex')
    // Newest-first: the later-created event sorts ahead of the earlier one.
    expect(newerIdx).toBeLessThan(olderIdx)
  })

  it('excludes other users’ events', async () => {
    const otherJob = await seedJob(otherUserId, 'Designer', 'Initech')
    const leaked = await timelineRepository.create({ userId: otherUserId, jobId: otherJob, type: 'AUTO', title: 'not yours' })

    const { rows } = await timelineRepository.findByUser(userId, 100, 0)
    expect(rows.some((r) => r.id === leaked.id)).toBe(false)
  })

  it('paginates via limit + offset', async () => {
    const { rows: all } = await timelineRepository.findByUser(userId, 100, 0)
    expect(all.length).toBeGreaterThanOrEqual(2)

    const { rows: firstPage } = await timelineRepository.findByUser(userId, 1, 0)
    const { rows: secondPage } = await timelineRepository.findByUser(userId, 1, 1)
    expect(firstPage).toHaveLength(1)
    expect(secondPage).toHaveLength(1)
    expect(firstPage[0]?.id).toBe(all[0]?.id)
    expect(secondPage[0]?.id).toBe(all[1]?.id)
    expect(firstPage[0]?.id).not.toBe(secondPage[0]?.id)
  })
})
