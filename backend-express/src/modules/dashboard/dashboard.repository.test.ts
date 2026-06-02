import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { jobs } from '@/db/schema/jobs.js'
import { dashboardRepository } from './dashboard.repository.js'

const EMAIL = `dash-repo-${Date.now()}@example.com`
let userId: string

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) {
    process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  }
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const rows = await getDb().insert(users).values({ name: 'Dash', email: EMAIL, passwordHash: 'h' }).returning()
  const row = rows[0]
  if (!row) throw new Error('failed to seed user')
  userId = row.id
  await getDb().insert(jobs).values([
    { userId, title: 'Beta', company: 'Acme', status: 'APPLIED', kanbanOrder: 2, lastActivityAt: new Date() },
    { userId, title: 'Alpha', company: 'Globex', status: 'APPLIED', kanbanOrder: 1, lastActivityAt: new Date() },
    { userId, title: 'Gamma', company: 'Initech', status: 'WISHLIST', kanbanOrder: 1, lastActivityAt: new Date() },
  ])
})

afterAll(async () => {
  await getDb().delete(jobs).where(eq(jobs.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('dashboardRepository.findForUser (real DB)', () => {
  it('returns all the user jobs ordered by kanbanOrder asc', async () => {
    const rows = await dashboardRepository.findForUser(userId, {})
    expect(rows).toHaveLength(3)
    // APPLIED Alpha(1) before Beta(2); WISHLIST Gamma(1) — global asc by kanbanOrder
    expect(rows.map((r) => r.title).slice(0, 2)).toEqual(['Alpha', 'Gamma'])
  })
  it('filters by status', async () => {
    const rows = await dashboardRepository.findForUser(userId, { status: 'WISHLIST' })
    expect(rows.every((r) => r.status === 'WISHLIST')).toBe(true)
    expect(rows).toHaveLength(1)
  })
  it('filters by search (ILIKE title/company)', async () => {
    const rows = await dashboardRepository.findForUser(userId, { search: 'globex' })
    expect(rows.map((r) => r.title)).toEqual(['Alpha'])
  })
  it('is scoped to the owner', async () => {
    const rows = await dashboardRepository.findForUser('00000000-0000-0000-0000-000000000000', {})
    expect(rows).toHaveLength(0)
  })
})
