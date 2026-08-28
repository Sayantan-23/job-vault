import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { inArray } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { jobs } from '@/db/schema/jobs.js'
import { personas } from '@/db/schema/personas.js'
import { generatedResumes } from '@/db/schema/generated-resumes.js'
import { coverLetters } from '@/db/schema/cover-letters.js'
import { questionAnswers } from '@/db/schema/question-answers.js'
import { searchRepository } from './search.repository.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'
import type { ProfileContent } from '@/shared/profile-content.schema.js'

// Letters-only nonsense words: unique per run (the suite shares the dev DB), one
// clean token for the FTS parser, and — because every branch ALSO matches on
// similarity() — mutually trigram-dissimilar, which a shared suffix would not be.
const word = (): string => Array.from({ length: 12 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('')

const TITLE_TAG = word() // jobs.title, on BOTH users
const BODY_TAG = word() // jobs.snapshot_markdown only
const ANSWER_TAG = word() // seven answers, to prove the per-type cap
const PERSONA_NAME = `Persona ${word()}`

const EMAIL = `search-repo-${Date.now()}@example.com`
const C: ResumeContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
const P: ProfileContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }

let userId: string
let otherUserId: string
let jobId: string
let personaId: string
let otherJobId: string

async function seedFor(uid: string): Promise<{ jobId: string; personaId: string }> {
  const db = getDb()
  const jobRows = await db
    .insert(jobs)
    .values({
      userId: uid,
      title: `Staff Engineer ${TITLE_TAG}`,
      company: 'Acme Corp',
      snapshotMarkdown: `Responsibilities include shipping ${BODY_TAG} pipelines end to end.`,
    })
    .returning()
  const personaRows = await db
    .insert(personas)
    .values({ userId: uid, name: PERSONA_NAME, data: P, rawInput: 'Backend engineer, eight years.' })
    .returning()
  const job = jobRows[0]
  const persona = personaRows[0]
  if (!job || !persona) throw new Error('failed to seed job/persona')

  await db
    .insert(generatedResumes)
    .values({ userId: uid, personaId: persona.id, title: 'Platform resume', instructions: 'Lead with platform work.', content: C })
  await db.insert(coverLetters).values({
    userId: uid,
    adhocJob: { title: 'Pasted role', company: 'Pasted co' },
    title: 'Platform letter',
    bodyMarkdown: 'Dear hiring team, I am writing about the platform role.',
  })
  // Seven answers sharing one tag: five is the per-type ceiling the query enforces.
  await db.insert(questionAnswers).values(
    Array.from({ length: 7 }, (_, i) => ({
      userId: uid,
      question: `Why do you want this ${ANSWER_TAG} role, take ${i}?`,
      answerShort: 'Because of the platform work.',
      answerLong: 'A longer version of the same answer about the platform work.',
    })),
  )
  return { jobId: job.id, personaId: persona.id }
}

beforeAll(async () => {
  if (!process.env['DATABASE_URL']) process.env['DATABASE_URL'] = 'postgres://postgres:postgres@localhost:5433/jobvault'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  const rows = await getDb()
    .insert(users)
    .values([
      { name: 'U', email: EMAIL, passwordHash: 'h' },
      { name: 'O', email: `other-${EMAIL}`, passwordHash: 'h' },
    ])
    .returning()
  const [mine, other] = rows
  if (!mine || !other) throw new Error('failed to seed users')
  userId = mine.id
  otherUserId = other.id

  const mineSeed = await seedFor(userId)
  jobId = mineSeed.jobId
  personaId = mineSeed.personaId
  // User B gets byte-identical rows, so every assertion below also proves scoping.
  const otherSeed = await seedFor(otherUserId)
  otherJobId = otherSeed.jobId
})

afterAll(async () => {
  // Every seeded table's user_id is ON DELETE CASCADE, so dropping the users
  // drops the rows.
  await getDb().delete(users).where(inArray(users.id, [userId, otherUserId]))
  await closeDb()
})

describe('searchRepository (real DB)', () => {
  it('finds a job by a term in its title', async () => {
    const results = await searchRepository.search(userId, TITLE_TAG)
    expect(results).toHaveLength(1)
    expect(results[0]?.type).toBe('job')
    expect(results[0]?.id).toBe(jobId)
    expect(results[0]?.title).toContain(TITLE_TAG)
    expect(results[0]?.subtitle).toBe('Acme Corp')
  })

  it('finds a job by a term that only appears in its scraped body', async () => {
    const results = await searchRepository.search(userId, BODY_TAG)
    expect(results.map((r) => r.id)).toEqual([jobId])
    // Highlights are delimited with STX/ETX control characters, never HTML —
    // snapshot_markdown is third-party scraped text.
    expect(results[0]?.snippet).toContain('\u0002')
    expect(results[0]?.snippet).not.toContain('<b>')
  })

  it('finds a persona through a one-character typo in its name (pg_trgm)', async () => {
    const typo = PERSONA_NAME.slice(0, -1)
    const results = await searchRepository.search(userId, typo)
    expect(results.map((r) => r.id)).toContain(personaId)
    expect(results.find((r) => r.id === personaId)?.type).toBe('persona')
  })

  it("never returns another user's identical rows", async () => {
    for (const term of [TITLE_TAG, BODY_TAG, ANSWER_TAG, PERSONA_NAME]) {
      const results = await searchRepository.search(userId, term)
      expect(results.map((r) => r.id)).not.toContain(otherJobId)
      expect(results.length).toBeGreaterThan(0)
    }
    expect((await searchRepository.search(otherUserId, TITLE_TAG)).map((r) => r.id)).toEqual([otherJobId])
  })

  it('returns an empty array when nothing matches', async () => {
    expect(await searchRepository.search(userId, word())).toEqual([])
  })

  it('caps any single type at five rows', async () => {
    const results = await searchRepository.search(userId, ANSWER_TAG)
    expect(results.filter((r) => r.type === 'answer')).toHaveLength(5)
  })
})
