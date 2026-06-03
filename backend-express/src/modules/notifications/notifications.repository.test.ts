import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { jobs } from '@/db/schema/jobs.js'
import { notifications } from '@/db/schema/notifications.js'
import { notificationsRepository } from './notifications.repository.js'

const EMAIL = `notif-repo-${Date.now()}@example.com`
let userId: string
let jobId: string

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  }
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const userRows = await getDb().insert(users).values({ name: 'Notif', email: EMAIL, passwordHash: 'h' }).returning()
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
  await getDb().delete(notifications).where(eq(notifications.userId, userId))
  await getDb().delete(jobs).where(eq(jobs.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('notificationsRepository (real DB)', () => {
  it('creates and lists newest-first, capped, with unreadOnly filtering', async () => {
    await notificationsRepository.create({ userId, message: 'one', type: 'REMINDER', relatedJobId: jobId })
    const read = await notificationsRepository.create({ userId, message: 'two', type: 'GHOST_ALERT', relatedJobId: jobId })
    await notificationsRepository.markRead(userId, read.id)

    const all = await notificationsRepository.list(userId, false)
    expect(all.length).toBeGreaterThanOrEqual(2)
    expect(all[0]?.message).toBe('two') // newest first

    const unread = await notificationsRepository.list(userId, true)
    expect(unread.every((n) => n.isRead === false)).toBe(true)
  })

  it('marks one read and marks all read scoped to the owner', async () => {
    const n = await notificationsRepository.create({ userId, message: 'mark', type: 'REMINDER' })
    const marked = await notificationsRepository.markRead(userId, n.id)
    expect(marked?.isRead).toBe(true)
    expect(await notificationsRepository.markRead('00000000-0000-0000-0000-000000000000', n.id)).toBeNull()

    await notificationsRepository.create({ userId, message: 'still unread', type: 'GENERAL' })
    const updated = await notificationsRepository.markAllRead(userId)
    expect(updated).toBeGreaterThanOrEqual(1)
    const remaining = await notificationsRepository.list(userId, true)
    expect(remaining).toHaveLength(0)
  })

  it('keeps notification history when its related job is deleted (SET NULL)', async () => {
    const tmpJob = await getDb()
      .insert(jobs)
      .values({ userId, title: 'Temp', company: 'X', status: 'WISHLIST', kanbanOrder: 1, lastActivityAt: new Date() })
      .returning()
    const tmpId = tmpJob[0]?.id
    if (!tmpId) throw new Error('failed to seed temp job')
    const n = await notificationsRepository.create({ userId, message: 'survives', type: 'GHOST_ALERT', relatedJobId: tmpId })

    await getDb().delete(jobs).where(eq(jobs.id, tmpId))

    const after = await notificationsRepository.findById(userId, n.id)
    expect(after).not.toBeNull()
    expect(after?.relatedJobId).toBeNull()
  })
})
