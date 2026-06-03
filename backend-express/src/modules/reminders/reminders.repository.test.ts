import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { jobs } from '@/db/schema/jobs.js'
import { reminders } from '@/db/schema/reminders.js'
import { remindersRepository } from './reminders.repository.js'

const EMAIL = `reminders-repo-${Date.now()}@example.com`
let userId: string
let jobId: string

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  }
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const userRows = await getDb().insert(users).values({ name: 'Rem', email: EMAIL, passwordHash: 'h' }).returning()
  const user = userRows[0]
  if (!user) throw new Error('failed to seed user')
  userId = user.id
  const jobRows = await getDb()
    .insert(jobs)
    .values({ userId, title: 'Role', company: 'Acme', status: 'APPLIED', kanbanOrder: 1, lastActivityAt: new Date() })
    .returning()
  const job = jobRows[0]
  if (!job) throw new Error('failed to seed job')
  jobId = job.id
})

afterAll(async () => {
  await getDb().delete(reminders).where(eq(reminders.userId, userId))
  await getDb().delete(jobs).where(eq(jobs.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('remindersRepository (real DB)', () => {
  it('creates and lists reminders for a job ordered by remindAt asc', async () => {
    await remindersRepository.create({ userId, jobId, message: 'Later', remindAt: new Date('2026-08-01T00:00:00Z') })
    await remindersRepository.create({ userId, jobId, message: 'Sooner', remindAt: new Date('2026-07-01T00:00:00Z') })
    const rows = await remindersRepository.listForJob(userId, jobId)
    expect(rows.map((r) => r.message)).toEqual(['Sooner', 'Later'])
  })

  it('finds, updates and deletes scoped to the owner', async () => {
    const created = await remindersRepository.create({
      userId,
      jobId,
      message: 'Edit me',
      remindAt: new Date('2026-09-01T00:00:00Z'),
    })
    expect((await remindersRepository.findById(userId, created.id))?.message).toBe('Edit me')
    expect(await remindersRepository.findById('00000000-0000-0000-0000-000000000000', created.id)).toBeNull()

    const updated = await remindersRepository.update(userId, created.id, { message: 'Edited', isCompleted: true })
    expect(updated?.message).toBe('Edited')
    expect(updated?.isCompleted).toBe(true)

    expect(await remindersRepository.remove(userId, created.id)).toBe(true)
    expect(await remindersRepository.findById(userId, created.id)).toBeNull()
    expect(await remindersRepository.remove(userId, created.id)).toBe(false)
  })

  it('findDue returns only past-due, not-completed reminders', async () => {
    const past = await remindersRepository.create({
      userId,
      jobId,
      message: 'Due now',
      remindAt: new Date('2000-01-01T00:00:00Z'),
    })
    await remindersRepository.create({
      userId,
      jobId,
      message: 'Future',
      remindAt: new Date('2099-01-01T00:00:00Z'),
    })
    const due = await remindersRepository.findDue(new Date())
    expect(due.some((r) => r.id === past.id)).toBe(true)
    expect(due.every((r) => r.isCompleted === false)).toBe(true)

    await remindersRepository.markCompleted([past.id])
    const dueAfter = await remindersRepository.findDue(new Date())
    expect(dueAfter.some((r) => r.id === past.id)).toBe(false)
  })

  it('findDue treats remindAt as a UTC instant boundary (due at/after, not-due just before)', async () => {
    // An explicit UTC instant. findDue must return it when "now" is at/after the
    // instant and exclude it the millisecond before — proving the comparison is on
    // the stored UTC timestamp, not a local wall-clock interpretation.
    const boundary = new Date('2026-06-20T00:00:00.000Z')
    const onBoundary = await remindersRepository.create({
      userId,
      jobId,
      message: 'UTC boundary',
      remindAt: boundary,
    })

    const justBefore = new Date(boundary.getTime() - 1)
    const beforeDue = await remindersRepository.findDue(justBefore)
    expect(beforeDue.some((r) => r.id === onBoundary.id)).toBe(false)

    const atBoundary = await remindersRepository.findDue(boundary)
    expect(atBoundary.some((r) => r.id === onBoundary.id)).toBe(true)

    await remindersRepository.markCompleted([onBoundary.id])
  })
})
