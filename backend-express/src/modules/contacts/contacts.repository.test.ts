import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { jobs } from '@/db/schema/jobs.js'
import { jobContacts } from '@/db/schema/job-contacts.js'
import { contactsRepository } from './contacts.repository.js'

const EMAIL = `contacts-repo-${Date.now()}@example.com`
let userId: string
let jobId: string
let otherJobId: string

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  }
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const userRows = await getDb().insert(users).values({ name: 'Con', email: EMAIL, passwordHash: 'h' }).returning()
  const user = userRows[0]
  if (!user) throw new Error('failed to seed user')
  userId = user.id
  const jobRows = await getDb()
    .insert(jobs)
    .values([
      { userId, title: 'Role A', company: 'Acme', status: 'APPLIED', kanbanOrder: 1, lastActivityAt: new Date() },
      { userId, title: 'Role B', company: 'Bcme', status: 'APPLIED', kanbanOrder: 2, lastActivityAt: new Date() },
    ])
    .returning()
  const [jobA, jobB] = jobRows
  if (!jobA || !jobB) throw new Error('failed to seed jobs')
  jobId = jobA.id
  otherJobId = jobB.id
})

afterAll(async () => {
  await getDb().delete(jobContacts).where(eq(jobContacts.userId, userId))
  await getDb().delete(jobs).where(eq(jobs.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('contactsRepository (real DB)', () => {
  it('creates with defaults and lists newest-outreach-first', async () => {
    const older = await contactsRepository.create({
      userId, jobId, contact: 'Older', reachedOutAt: new Date('2026-07-01T00:00:00Z'),
    })
    expect(older.status).toBe('NO_RESPONSE')
    expect(older.channel).toBeNull()
    await contactsRepository.create({
      userId, jobId, contact: 'Newer', reachedOutAt: new Date('2026-07-10T00:00:00Z'),
    })
    const rows = await contactsRepository.listForJob(userId, jobId)
    expect(rows.map((r) => r.contact)).toEqual(['Newer', 'Older'])
  })

  it('finds, updates and deletes scoped to the owner', async () => {
    const created = await contactsRepository.create({ userId, jobId, contact: 'Edit me', channel: 'EMAIL' })
    expect((await contactsRepository.findById(userId, created.id))?.contact).toBe('Edit me')
    expect(await contactsRepository.findById('00000000-0000-0000-0000-000000000000', created.id)).toBeNull()

    const updated = await contactsRepository.update(userId, created.id, { status: 'HEARD_BACK', channel: null })
    expect(updated?.status).toBe('HEARD_BACK')
    expect(updated?.channel).toBeNull()

    expect(await contactsRepository.remove(userId, created.id)).toBe(true)
    expect(await contactsRepository.findById(userId, created.id)).toBeNull()
    expect(await contactsRepository.remove(userId, created.id)).toBe(false)
  })

  it('countsForJobs returns totals and reply counts per job, empty map for no ids', async () => {
    // jobId already has 2 NO_RESPONSE contacts from the first test.
    const c = await contactsRepository.create({ userId, jobId: otherJobId, contact: 'R1' })
    await contactsRepository.update(userId, c.id, { status: 'REFERRED' })
    await contactsRepository.create({ userId, jobId: otherJobId, contact: 'R2' })

    const counts = await contactsRepository.countsForJobs(userId, [jobId, otherJobId])
    expect(counts.get(jobId)).toEqual({ outreachCount: 2, outreachReplies: 0 })
    expect(counts.get(otherJobId)).toEqual({ outreachCount: 2, outreachReplies: 1 })

    expect((await contactsRepository.countsForJobs(userId, [])).size).toBe(0)
  })
})
