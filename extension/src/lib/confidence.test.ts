import { describe, it, expect } from 'vitest'
import { scoreConfidence } from './confidence'

describe('scoreConfidence', () => {
  it('is ok with title+company, partial with one, empty with none', () => {
    expect(scoreConfidence({ title: 'T', company: 'C' })).toBe('ok')
    expect(scoreConfidence({ title: 'T' })).toBe('partial')
    expect(scoreConfidence({ company: 'C' })).toBe('partial')
    expect(scoreConfidence({})).toBe('empty')
    expect(scoreConfidence({ title: '  ', company: '' })).toBe('empty')
  })
})
