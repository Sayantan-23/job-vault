import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { users } from '@/db/schema/users.js'
import { questionAnswers } from '@/db/schema/question-answers.js'
import { answersRepository } from './answers.repository.js'

const EMAIL = `answers-repo-${Date.now()}@example.com`
let userId: string
let otherUserId: string

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
})

afterAll(async () => {
  await getDb().delete(questionAnswers).where(eq(questionAnswers.userId, userId))
  await getDb().delete(questionAnswers).where(eq(questionAnswers.userId, otherUserId))
  await getDb().delete(users).where(eq(users.id, userId))
  await getDb().delete(users).where(eq(users.id, otherUserId))
  await closeDb()
})

describe('answersRepository (real DB)', () => {
  it('creates, finds, updates and removes, scoped to the owner', async () => {
    const created = await answersRepository.create({
      userId,
      question: 'Why are you leaving?',
      answerShort: 'Growth.',
      answerLong: null,
    })
    expect(created.question).toBe('Why are you leaving?')
    expect(created.lastUsedAt).toBeNull()

    expect(await answersRepository.findById(userId, created.id)).not.toBeNull()
    expect(await answersRepository.findById(otherUserId, created.id)).toBeNull()

    const updated = await answersRepository.update(userId, created.id, { answerLong: 'A longer version.' })
    expect(updated?.answerLong).toBe('A longer version.')
    expect(await answersRepository.update(otherUserId, created.id, { answerShort: 'hax' })).toBeNull()

    expect(await answersRepository.remove(otherUserId, created.id)).toBe(false)
    expect(await answersRepository.remove(userId, created.id)).toBe(true)
    expect(await answersRepository.findById(userId, created.id)).toBeNull()
  })

  it('orders by last used first, then most recently updated, and never leaks another user', async () => {
    const never = await answersRepository.create({ userId, question: 'Never used', answerShort: 'a', answerLong: null })
    const used = await answersRepository.create({ userId, question: 'Used', answerShort: 'b', answerLong: null })
    await answersRepository.create({ userId: otherUserId, question: 'Theirs', answerShort: 'c', answerLong: null })

    await answersRepository.markUsed(userId, used.id)

    const list = await answersRepository.listForUser(userId)
    expect(list.map((a) => a.question)).toEqual(['Used', 'Never used'])
    expect(list.some((a) => a.question === 'Theirs')).toBe(false)

    await getDb().delete(questionAnswers).where(eq(questionAnswers.id, never.id))
    await getDb().delete(questionAnswers).where(eq(questionAnswers.id, used.id))
  })

  it('markUsed stamps a timestamp and refuses another user', async () => {
    const row = await answersRepository.create({ userId, question: 'Stamp me', answerShort: 'x', answerLong: null })
    expect(await answersRepository.markUsed(otherUserId, row.id)).toBeNull()

    const stamped = await answersRepository.markUsed(userId, row.id)
    expect(stamped?.lastUsedAt).toBeInstanceOf(Date)
    // Copying is not an edit — updatedAt must not move.
    expect(stamped?.updatedAt.getTime()).toBe(row.updatedAt.getTime())

    await getDb().delete(questionAnswers).where(eq(questionAnswers.id, row.id))
  })
})
