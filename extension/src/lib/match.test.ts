import { describe, it, expect } from 'vitest'
import { similarity, rankAnswers, MATCH_THRESHOLD, type RankableAnswer } from './match'

const a = (id: string, question: string, lastUsedAt: string | null = null): RankableAnswer =>
  ({ id, question, lastUsedAt })

describe('similarity', () => {
  it('scores an exact match as 1', () => {
    expect(similarity('Why do you want to work here?', 'Why do you want to work here?')).toBe(1)
  })

  it('ignores case and punctuation', () => {
    expect(similarity('Why us?', 'why us')).toBe(1)
  })

  it('scores a reworded question above the threshold', () => {
    const score = similarity(
      'Why do you want to work at Acme?',
      'Why do you want to work at this company?',
    )
    expect(score).toBeGreaterThan(MATCH_THRESHOLD)
  })

  it('scores an unrelated question below the threshold', () => {
    const score = similarity(
      'What is your expected salary?',
      'Describe a time you resolved a conflict on your team.',
    )
    expect(score).toBeLessThan(MATCH_THRESHOLD)
  })

  it('returns 0 for an empty input', () => {
    expect(similarity('', 'anything')).toBe(0)
  })
})

describe('rankAnswers', () => {
  it('puts the best match first and flags it', () => {
    const ranked = rankAnswers(
      [a('1', 'What are your salary expectations?'), a('2', 'Why do you want to work at this company?')],
      'Why do you want to work at Acme?',
    )
    expect(ranked[0]!.answer.id).toBe('2')
    expect(ranked[0]!.isMatch).toBe(true)
    expect(ranked[1]!.isMatch).toBe(false)
  })

  it('falls back to last-used order when there is no question', () => {
    const ranked = rankAnswers(
      [a('1', 'Older', '2026-01-01T00:00:00Z'), a('2', 'Newer', '2026-06-01T00:00:00Z')],
      null,
    )
    expect(ranked.map((r) => r.answer.id)).toEqual(['2', '1'])
    expect(ranked.every((r) => !r.isMatch)).toBe(true)
  })

  it('sorts never-used answers after used ones', () => {
    const ranked = rankAnswers([a('1', 'Never used', null), a('2', 'Used', '2026-06-01T00:00:00Z')], null)
    expect(ranked.map((r) => r.answer.id)).toEqual(['2', '1'])
  })
})
