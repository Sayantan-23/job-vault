import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { personas } from '@/db/schema/personas.js'
import { personasRepository } from './personas.repository.js'
import type { ProfileContent } from '@/shared/profile-content.schema.js'

const EMAIL = `personas-repo-${Date.now()}@example.com`
let userId: string
const DATA: ProfileContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }

const LEGACY = {
  basics: { name: 'Legacy', email: 'l@example.com', links: [{ label: 'GitHub', url: 'https://github.com/x' }] },
  summary: 'Old summary',
  experience: [{ company: 'Acme', title: 'Engineer', date: 'Jan 2022 – Present', bullets: ['Shipped things'] }],
  projects: [{ name: 'Proj', tagline: 'A tool', url: 'https://proj.dev', bullets: ['Built it'] }],
  skills: [{ category: 'Languages', items: ['TypeScript'] }],
  education: [{ degree: 'BSc', institution: 'Uni', period: '2018 – 2022' }],
}

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const rows = await getDb().insert(users).values({ name: 'P', email: EMAIL, passwordHash: 'h' }).returning()
  const row = rows[0]
  if (!row) throw new Error('failed to seed user')
  userId = row.id
})

afterAll(async () => {
  await getDb().delete(personas).where(eq(personas.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('personasRepository (real DB)', () => {
  it('creates, counts, lists, finds, updates and removes user-scoped', async () => {
    const created = await personasRepository.create({ userId, name: 'Backend', data: DATA, rawInput: 'raw' })
    expect(created.name).toBe('Backend')
    expect(await personasRepository.countForUser(userId)).toBe(1)

    const list = await personasRepository.listForUser(userId)
    expect(list).toHaveLength(1)

    const found = await personasRepository.findById(userId, created.id)
    expect(found?.id).toBe(created.id)
    expect(await personasRepository.findById('00000000-0000-0000-0000-000000000000', created.id)).toBeNull()

    const updated = await personasRepository.update(userId, created.id, { name: 'Full-stack' })
    expect(updated?.name).toBe('Full-stack')

    expect(await personasRepository.remove(userId, created.id)).toBe(true)
    expect(await personasRepository.countForUser(userId)).toBe(0)
  })

  it('normalizes a legacy ResumeContent row on read (findById + listForUser)', async () => {
    const rows = await getDb()
      .insert(personas)
      .values({ userId, name: 'Legacy persona', data: LEGACY as unknown as ProfileContent })
      .returning()
    const inserted = rows[0]
    if (!inserted) throw new Error('insert returned no row')

    const found = await personasRepository.findById(userId, inserted.id)
    if (!found) throw new Error('persona not found')
    const data = found.data
    expect(data.experience[0]?.role).toBe('Engineer')
    expect(data.experience[0]?.startDate?.year).toBe(2022)
    expect(data.experience[0]?.current).toBe(true)
    expect(data.experience[0]?.id).toBeTruthy()
    expect(data.projects[0]?.description).toBe('A tool')
    expect(data.projects[0]?.links[0]?.url).toBe('https://proj.dev')
    expect(data.education[0]?.startDate?.year).toBe(2018)
    expect(data.education[0]?.endDate?.year).toBe(2022)
    expect(data.education[0]?.id).toBeTruthy()

    const listed = await personasRepository.listForUser(userId)
    const fromList = listed.find((p) => p.id === inserted.id)
    expect(fromList?.data.experience[0]?.role).toBe('Engineer')
    expect(fromList?.data.skills[0]?.id).toBeTruthy()

    await getDb().delete(personas).where(eq(personas.id, inserted.id))
  })

  it('normalizes the row returned by a name-only update on a legacy ResumeContent row', async () => {
    const rows = await getDb()
      .insert(personas)
      .values({ userId, name: 'Legacy to rename', data: LEGACY as unknown as ProfileContent })
      .returning()
    const inserted = rows[0]
    if (!inserted) throw new Error('insert returned no row')

    const updated = await personasRepository.update(userId, inserted.id, { name: 'Renamed' })
    if (!updated) throw new Error('update returned no row')
    expect(updated.name).toBe('Renamed')
    const data = updated.data
    expect(data.experience[0]?.role).toBe('Engineer')
    expect(data.experience[0]?.startDate?.year).toBe(2022)
    expect(data.experience[0]?.current).toBe(true)
    expect(data.experience[0]?.id).toBeTruthy()
    expect(data.experience[0]).not.toHaveProperty('title')
    expect(data.experience[0]).not.toHaveProperty('date')
    expect(data.education[0]?.startDate?.year).toBe(2018)
    expect(data.education[0]).not.toHaveProperty('period')

    await getDb().delete(personas).where(eq(personas.id, inserted.id))
  })

  it('passes a modern ProfileContent row through unchanged (ids preserved)', async () => {
    const modern: ProfileContent = {
      basics: { name: 'Modern', links: [{ id: 'link-1', label: 'Site', url: 'https://m.dev' }] },
      summary: 'New summary',
      experience: [
        {
          id: 'exp-1',
          company: 'Beta',
          role: 'Dev',
          startDate: { month: 3, year: 2021 },
          endDate: null,
          current: false,
          bullets: ['x'],
        },
      ],
      projects: [],
      skills: [{ id: 'skill-1', category: 'Tools', items: ['Git'] }],
      education: [],
    }
    const created = await personasRepository.create({ userId, name: 'Modern persona', data: modern, rawInput: null })
    const found = await personasRepository.findById(userId, created.id)
    expect(found?.data).toEqual(modern)
    expect(found?.data.experience[0]?.id).toBe('exp-1')
    await getDb().delete(personas).where(eq(personas.id, created.id))
  })
})
