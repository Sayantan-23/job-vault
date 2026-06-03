import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq, inArray } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { jobs } from '@/db/schema/jobs.js'
import { schedulerRepository } from './scheduler.repository.js'

const EMAIL_A = `sched-repo-a-${Date.now()}@example.com`
const EMAIL_B = `sched-repo-b-${Date.now()}@example.com`
let userA: string
let userB: string
let activeAId: string
let activeBId: string
let archivedId: string

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  }
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)

  const a = (await getDb().insert(users).values({ name: 'A', email: EMAIL_A, passwordHash: 'h' }).returning())[0]
  const b = (await getDb().insert(users).values({ name: 'B', email: EMAIL_B, passwordHash: 'h' }).returning())[0]
  if (!a || !b) throw new Error('failed to seed users')
  userA = a.id
  userB = b.id

  const activeA = (
    await getDb()
      .insert(jobs)
      .values({ userId: userA, title: 'Active A', company: 'Aco', status: 'APPLIED', kanbanOrder: 1, lastActivityAt: new Date() })
      .returning()
  )[0]
  const activeB = (
    await getDb()
      .insert(jobs)
      .values({ userId: userB, title: 'Active B', company: 'Bco', status: 'WISHLIST', kanbanOrder: 1, lastActivityAt: new Date() })
      .returning()
  )[0]
  const archived = (
    await getDb()
      .insert(jobs)
      .values({ userId: userA, title: 'Archived A', company: 'Aco', status: 'ARCHIVED', kanbanOrder: 2, lastActivityAt: new Date() })
      .returning()
  )[0]
  if (!activeA || !activeB || !archived) throw new Error('failed to seed jobs')
  activeAId = activeA.id
  activeBId = activeB.id
  archivedId = archived.id
})

afterAll(async () => {
  await getDb().delete(jobs).where(inArray(jobs.userId, [userA, userB]))
  await getDb().delete(users).where(inArray(users.id, [userA, userB]))
  await closeDb()
})

describe('schedulerRepository (real DB)', () => {
  it('findAllNonArchivedJobs returns non-ARCHIVED jobs across ALL users', async () => {
    const rows = await schedulerRepository.findAllNonArchivedJobs()
    const ids = rows.map((j) => j.id)
    expect(ids).toContain(activeAId)
    expect(ids).toContain(activeBId) // crosses the user boundary on purpose
    expect(ids).not.toContain(archivedId)
    expect(rows.every((j) => j.status !== 'ARCHIVED')).toBe(true)
  })

  it('setJobGhostDays persists the anchor by id', async () => {
    await schedulerRepository.setJobGhostDays(activeAId, 9)
    const row = (await getDb().select().from(jobs).where(eq(jobs.id, activeAId)))[0]
    expect(row?.ghostDays).toBe(9)
  })
})
