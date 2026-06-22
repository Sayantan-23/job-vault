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

  it('finds by exact sourceUrl scoped to the owner (extension dedup)', async () => {
    const url = `https://www.linkedin.com/jobs/view/${Date.now()}`
    const created = await jobsRepository.create({
      userId,
      title: 'Dedup Me',
      company: 'Acme',
      status: 'WISHLIST',
      kanbanOrder: 1,
      lastActivityAt: new Date(),
      sourceUrl: url,
    })
    expect((await jobsRepository.findBySourceUrl(userId, url))?.id).toBe(created.id)
    expect(await jobsRepository.findBySourceUrl(userId, `${url}-other`)).toBeNull()
    expect(await jobsRepository.findBySourceUrl('00000000-0000-0000-0000-000000000000', url)).toBeNull()
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

  it('ghostFilter derives days live from lastActivityAt (stale/ghost now match)', async () => {
    const now = Date.now()
    const stale = await jobsRepository.create({
      userId,
      title: 'Stale Role',
      company: 'StaleCo',
      status: 'APPLIED',
      kanbanOrder: 50,
      lastActivityAt: new Date(now - 10 * 86_400_000), // 10 days -> stale (8..14)
    })
    const ghost = await jobsRepository.create({
      userId,
      title: 'Ghost Role',
      company: 'GhostCo',
      status: 'APPLIED',
      kanbanOrder: 51,
      lastActivityAt: new Date(now - 30 * 86_400_000), // 30 days -> ghost (>14)
    })

    const staleRows = await jobsRepository.findAll(userId, {
      page: 1,
      limit: 100,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      ghostFilter: 'stale',
    })
    expect(staleRows.rows.some((j) => j.id === stale.id)).toBe(true)
    expect(staleRows.rows.some((j) => j.id === ghost.id)).toBe(false)

    const ghostRows = await jobsRepository.findAll(userId, {
      page: 1,
      limit: 100,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      ghostFilter: 'ghost',
    })
    expect(ghostRows.rows.some((j) => j.id === ghost.id)).toBe(true)
    expect(ghostRows.rows.some((j) => j.id === stale.id)).toBe(false)
  })

  it('filters by createdAt date range, with createdTo inclusive of that day', async () => {
    const mk = (title: string, createdAt: Date) =>
      jobsRepository.create({
        userId, title, company: 'Range', status: 'WISHLIST', kanbanOrder: 1, lastActivityAt: new Date(), createdAt,
      })
    await mk('Old', new Date('2020-06-15T12:00:00.000Z'))
    await mk('Mid', new Date('2022-06-15T12:00:00.000Z'))
    await mk('New', new Date('2024-06-15T12:00:00.000Z'))

    const q = (extra: Record<string, unknown>) =>
      jobsRepository.findAll(userId, { page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'desc', search: 'Range', ...extra })

    expect((await q({ createdFrom: '2021-01-01' })).rows.map((r) => r.title).sort()).toEqual(['Mid', 'New'])
    expect((await q({ createdTo: '2023-01-01' })).rows.map((r) => r.title).sort()).toEqual(['Mid', 'Old'])
    expect((await q({ createdFrom: '2021-01-01', createdTo: '2023-01-01' })).rows.map((r) => r.title)).toEqual(['Mid'])
    // createdTo equal to a job's own day still includes it (end-of-day inclusive)
    expect((await q({ createdTo: '2022-06-15' })).rows.map((r) => r.title).sort()).toEqual(['Mid', 'Old'])
    // createdFrom equal to a job's own day still includes it (start-of-day inclusive)
    expect((await q({ createdFrom: '2022-06-15' })).rows.map((r) => r.title).sort()).toEqual(['Mid', 'New'])
    // the date range narrows the total/count query too, not just the rows
    expect((await q({ createdFrom: '2021-01-01', createdTo: '2023-01-01' })).total).toBe(1)
  })
})
