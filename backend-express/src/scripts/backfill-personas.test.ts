import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { eq, inArray } from 'drizzle-orm'
import { backfillPersonas } from './backfill-personas.js'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { personas } from '@/db/schema/personas.js'
import { logger } from '@/shared/logger.js'
import { isLegacyResumeContent } from '@/shared/resume-to-profile.js'
import type { ProfileContent } from '@/shared/profile-content.schema.js'

const EMAIL = `backfill-personas-${Date.now()}@example.com`
let userId: string
let legacyId: string
let misleadingId: string
let anomalousId: string

// A genuine pre-7b ResumeContent payload — must be rewritten as ProfileContent.
const LEGACY = {
  basics: { name: 'Legacy', links: [] },
  summary: 'Old summary',
  experience: [{ company: 'Acme', title: 'Engineer', date: 'Jan 2022 – Present', bullets: ['Shipped'] }],
  projects: [],
  skills: [],
  education: [{ degree: 'BSc', institution: 'Uni', period: '2018 – 2022' }],
}

// Trips the legacy marker ('date' key) but fails ResumeContentSchema (no title);
// the lazy read path converts it via the ProfileContent fallback — the backfill must too.
const MISLEADING = {
  basics: { name: 'Ada', links: [] },
  summary: '',
  experience: [{ company: 'X', role: 'SWE', date: 'Jan 2022' }],
  projects: [],
  skills: [],
  education: [],
}

// Trips the legacy marker but fits NEITHER schema (basics.name missing) —
// the row must be logged + skipped without aborting the rest of the run.
const ANOMALOUS = { basics: {}, experience: [{ title: 'Ghost' }] }

async function seedPersona(name: string, data: unknown): Promise<string> {
  const rows = await getDb()
    .insert(personas)
    .values({ userId, name, data: data as ProfileContent })
    .returning({ id: personas.id })
  const row = rows[0]
  if (!row) throw new Error('insert returned no row')
  return row.id
}

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const rows = await getDb().insert(users).values({ name: 'B', email: EMAIL, passwordHash: 'h' }).returning()
  const row = rows[0]
  if (!row) throw new Error('failed to seed user')
  userId = row.id
  legacyId = await seedPersona('Legacy persona', LEGACY)
  misleadingId = await seedPersona('Misleading persona', MISLEADING)
  anomalousId = await seedPersona('Anomalous persona', ANOMALOUS)
})

afterAll(async () => {
  vi.restoreAllMocks()
  await getDb().delete(personas).where(eq(personas.userId, userId))
  await getDb().delete(users).where(eq(users.id, userId))
  await closeDb()
})

describe('backfillPersonas (real DB)', () => {
  it('converts legacy rows, skips anomalous rows without aborting, and reports counts', async () => {
    const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined)

    const result = await backfillPersonas()
    expect(result.converted).toBeGreaterThanOrEqual(2)
    expect(result.skipped).toBeGreaterThanOrEqual(1)
    expect(result.total).toBeGreaterThanOrEqual(3)

    const rows = await getDb()
      .select()
      .from(personas)
      .where(inArray(personas.id, [legacyId, misleadingId, anomalousId]))
    const byId = new Map(rows.map((r) => [r.id, r]))

    // Genuine legacy row is rewritten as ProfileContent.
    const legacyData = byId.get(legacyId)?.data
    expect(legacyData?.experience[0]?.role).toBe('Engineer')
    expect(legacyData?.experience[0]?.startDate?.year).toBe(2022)
    expect(legacyData?.experience[0]).not.toHaveProperty('title')
    expect(isLegacyResumeContent(legacyData)).toBe(false)

    // Misleading-marker row converts via the same fallback the read path has;
    // Zod strips the stray 'date' key, so it is no longer flagged legacy.
    const misleadingData = byId.get(misleadingId)?.data
    expect(misleadingData?.experience[0]?.role).toBe('SWE')
    expect(isLegacyResumeContent(misleadingData)).toBe(false)

    // Anomalous row is left untouched and logged with its persona id.
    expect(byId.get(anomalousId)?.data).toEqual(ANOMALOUS)
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ personaId: anomalousId }),
      expect.stringContaining('skipping'),
    )

    // Second run: the converted rows are no longer flagged (idempotent), and
    // the still-anomalous row is skipped again rather than throwing.
    const second = await backfillPersonas()
    expect(second.skipped).toBeGreaterThanOrEqual(1)
  })
})
