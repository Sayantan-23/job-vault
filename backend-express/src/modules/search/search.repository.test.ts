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

// Snippet-shaping fixtures (one job/résumé each, tag unique per run).
const MD_TAG = word() // sits in a body full of markdown markers
const SPOOF_TAG = word() // sits in a body carrying a literal STX sentinel
const TITLE_ONLY_TAG = word() // résumé title only — nothing to highlight in the body

// The two-band ranking fixture. RANK_TAG lives in one job's body (an FTS hit);
// RANK_NEAR is another job's whole title, one character off RANK_TAG — close
// enough for pg_trgm (~0.63) but a different lexeme, so it can never match FTS.
// The near-miss title is the WHOLE title on purpose: extra words dilute the
// trigram set and would drag similarity down towards the 0.3 floor.
const RANK_TAG = word()
const RANK_NEAR = `${RANK_TAG.slice(0, 6)}${RANK_TAG[6] === 'q' ? 'z' : 'q'}${RANK_TAG.slice(7)}`

const EMAIL = `search-repo-${Date.now()}@example.com`
const C: ResumeContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
const P: ProfileContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }

let userId: string
let otherUserId: string
let jobId: string
let personaId: string
let otherJobId: string
let rankBodyJobId: string
let rankNearJobId: string

async function seedFor(
  uid: string,
): Promise<{ jobId: string; personaId: string; rankBodyJobId: string; rankNearJobId: string }> {
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
  // Distinct companies so these two never collide with the 'Acme Corp' typo test.
  const rankRows = await db
    .insert(jobs)
    .values([
      {
        userId: uid,
        title: 'Ranking body match',
        company: `${word()} Systems`,
        snapshotMarkdown: `The deployment guide mentions ${RANK_TAG} throughout.`,
      },
      { userId: uid, title: RANK_NEAR, company: `${word()} Systems` },
    ])
    .returning()
  const job = jobRows[0]
  const persona = personaRows[0]
  const rankBody = rankRows[0]
  const rankNear = rankRows[1]
  if (!job || !persona || !rankBody || !rankNear) throw new Error('failed to seed job/persona')

  // Short bodies on purpose: under MaxWords the whole document is the fragment.
  await db.insert(jobs).values([
    {
      userId: uid,
      title: 'Markdown body',
      company: `${word()} Systems`,
      snapshotMarkdown: `Full-Stack **${MD_TAG}** ### role with \`code\` and ~~cuts~~.`,
    },
    {
      userId: uid,
      title: 'Spoofed sentinel body',
      company: `${word()} Systems`,
      snapshotMarkdown: `Scraped \u0002 text mentions ${SPOOF_TAG} once.`,
    },
  ])

  await db.insert(generatedResumes).values([
    { userId: uid, personaId: persona.id, title: 'Platform resume', instructions: 'Lead with platform work.', content: C },
    {
      userId: uid,
      personaId: persona.id,
      title: `Resume ${TITLE_ONLY_TAG}`,
      instructions: 'Emphasize product sense and TypeScript.',
      content: C,
    },
  ])
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
  return { jobId: job.id, personaId: persona.id, rankBodyJobId: rankBody.id, rankNearJobId: rankNear.id }
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
  rankBodyJobId = mineSeed.rankBodyJobId
  rankNearJobId = mineSeed.rankNearJobId
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

  it('matches a prefix of a word in a title', async () => {
    const results = await searchRepository.search(userId, TITLE_TAG.slice(0, 6))
    expect(results.some((r) => r.id === jobId)).toBe(true)
  })

  it('matches a prefix of a word in a body, and highlights it', async () => {
    const results = await searchRepository.search(userId, BODY_TAG.slice(0, 6))
    const hit = results.find((r) => r.id === jobId)
    expect(hit).toBeDefined()
    expect(hit?.snippet).toContain('\u0002')
  })

  it('matches a substring in the middle of a title', async () => {
    const results = await searchRepository.search(userId, TITLE_TAG.slice(4, 9))
    expect(results.some((r) => r.id === jobId)).toBe(true)
  })

  it('ranks an FTS hit above a substring-only hit', async () => {
    // BODY_TAG is an FTS hit on one job; nothing else can reach band 1 for it,
    // so an FTS hit must sort first. The same guarantee the two-band test makes
    // for trigram, now for the middle band.
    const results = await searchRepository.search(userId, BODY_TAG)
    expect(results.findIndex((r) => r.id === jobId)).toBe(0)
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

  // Regression guard: ts_rank (~0.06 for a good hit) and similarity (up to 1.0)
  // are incompatible scales, so a plain greatest() of the two put every fuzzy
  // title match above every exact body match.
  it('ranks an exact body match above a fuzzy title match', async () => {
    const ids = (await searchRepository.search(userId, RANK_TAG)).map((r) => r.id)
    expect(ids).toContain(rankBodyJobId)
    expect(ids).toContain(rankNearJobId)
    expect(ids.indexOf(rankBodyJobId)).toBeLessThan(ids.indexOf(rankNearJobId))
  })

  it('finds a job through a one-character typo in its company', async () => {
    // 'Acne Corp' shares no lexeme with the row, so this can only match on trigrams.
    expect((await searchRepository.search(userId, 'Acne Corp')).map((r) => r.id)).toEqual([jobId])
  })

  it('caps any single type at five rows', async () => {
    const results = await searchRepository.search(userId, ANSWER_TAG)
    expect(results.filter((r) => r.type === 'answer')).toHaveLength(5)
  })

  // snapshot_markdown and body_markdown are markdown, so an unstripped source
  // put literal '**' and '###' next to otherwise clean typography.
  it('strips markdown markers out of a snippet, keeping hyphens', async () => {
    const results = await searchRepository.search(userId, MD_TAG)
    expect(results).toHaveLength(1)
    const snippet = results[0]?.snippet ?? ''
    expect(snippet).not.toMatch(/[*#`~]/)
    expect(snippet).toContain('Full-Stack')
    expect(snippet).toContain(`\u0002${MD_TAG}\u0003`)
  })

  // The client splits the snippet on the sentinels and treats odd segments as
  // marked, so one unpaired STX from a scraped page inverts every highlight
  // after it.
  it('drops a sentinel already present in the source, so highlights stay paired', async () => {
    const results = await searchRepository.search(userId, SPOOF_TAG)
    expect(results).toHaveLength(1)
    const snippet = results[0]?.snippet ?? ''
    // split, not a regex: eslint's no-control-regex forbids the literal sentinel.
    expect(snippet.split('\u0002')).toHaveLength(2)
    expect(snippet.split('\u0003')).toHaveLength(2)
    expect(snippet).toContain(`\u0002${SPOOF_TAG}\u0003`)
  })

  // With no match in the body ts_headline returns the head of the document, so
  // the row showed an unrelated, unhighlighted excerpt.
  it('returns no snippet when only the title matched', async () => {
    const titleOnly = await searchRepository.search(userId, TITLE_ONLY_TAG)
    expect(titleOnly).toHaveLength(1)
    expect(titleOnly[0]?.type).toBe('resume')
    expect(titleOnly[0]?.snippet).toBeNull()
    // A body match still gets its highlighted excerpt.
    expect((await searchRepository.search(userId, BODY_TAG))[0]?.snippet).toContain('\u0002')
  })
})
