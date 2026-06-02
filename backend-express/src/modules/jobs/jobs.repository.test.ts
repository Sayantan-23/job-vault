import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { jobs } from '@/db/schema/jobs.js'
import { jobsRepository } from './jobs.repository.js'

const EMAIL = `jobs-repo-${Date.now()}@example.com`
let userId: string

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  }
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const rows = await getDb().insert(users).values({ name: 'Repo', email: EMAIL, passwordHash: 'h' }).returning()
  const row = rows[0]
  if (!row) throw new Error('failed to seed user')
  userId = row.id
})

afterAll(async () => {
  await getDb().delete(jobs).where(eq(jobs.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('jobsRepository (real DB)', () => {
  it('auto-increments kanbanOrder per status on create', async () => {
    const a = await jobsRepository.create({
      userId,
      title: 'A',
      company: 'Acme',
      status: 'WISHLIST',
      kanbanOrder: await jobsRepository.nextKanbanOrder(userId, 'WISHLIST'),
      lastActivityAt: new Date(),
    })
    const b = await jobsRepository.create({
      userId,
      title: 'B',
      company: 'Acme',
      status: 'WISHLIST',
      kanbanOrder: await jobsRepository.nextKanbanOrder(userId, 'WISHLIST'),
      lastActivityAt: new Date(),
    })
    expect(b.kanbanOrder).toBeGreaterThan(a.kanbanOrder)
  })

  it('finds by id scoped to the owner, and returns null for a stranger', async () => {
    const created = await jobsRepository.create({
      userId,
      title: 'Find Me',
      company: 'Acme',
      status: 'APPLIED',
      kanbanOrder: 1,
      lastActivityAt: new Date(),
    })
    expect((await jobsRepository.findById(userId, created.id))?.title).toBe('Find Me')
    expect(await jobsRepository.findById('00000000-0000-0000-0000-000000000000', created.id)).toBeNull()
  })

  it('filters by search (ILIKE title/company) and status, and paginates', async () => {
    await jobsRepository.create({
      userId,
      title: 'Rust Engineer',
      company: 'Mozilla',
      status: 'INTERVIEWING',
      kanbanOrder: 1,
      lastActivityAt: new Date(),
    })
    const bySearch = await jobsRepository.findAll(userId, {
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      search: 'mozilla',
    })
    expect(bySearch.rows.some((j) => j.company === 'Mozilla')).toBe(true)
    expect(bySearch.total).toBeGreaterThanOrEqual(1)

    const byStatus = await jobsRepository.findAll(userId, {
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      status: 'INTERVIEWING',
    })
    expect(byStatus.rows.every((j) => j.status === 'INTERVIEWING')).toBe(true)
  })

  it('updates, moves, and deletes (all owner-scoped)', async () => {
    const created = await jobsRepository.create({
      userId,
      title: 'Edit',
      company: 'Acme',
      status: 'WISHLIST',
      kanbanOrder: 1,
      lastActivityAt: new Date(),
    })
    const updated = await jobsRepository.update(userId, created.id, { title: 'Edited', notes: 'hi' })
    expect(updated?.title).toBe('Edited')

    const moved = await jobsRepository.move(userId, created.id, 'OFFER', 5)
    expect(moved?.status).toBe('OFFER')
    expect(moved?.kanbanOrder).toBe(5)

    expect(await jobsRepository.remove(userId, created.id)).toBe(true)
    expect(await jobsRepository.findById(userId, created.id)).toBeNull()
    expect(await jobsRepository.remove(userId, created.id)).toBe(false)
  })
})
