import { describe, it, expect } from 'vitest'
import { diffWords } from './word-diff'

describe('diffWords', () => {
  it('returns a single equal segment for identical text', () => {
    expect(diffWords('hello world', 'hello world')).toEqual([{ op: 'equal', text: 'hello world' }])
  })

  it('marks purely inserted text', () => {
    expect(diffWords('', 'new')).toEqual([{ op: 'insert', text: 'new' }])
  })

  it('marks purely deleted text', () => {
    expect(diffWords('gone', '')).toEqual([{ op: 'delete', text: 'gone' }])
  })

  it('diffs a word substitution while keeping surrounding words equal', () => {
    // "I has been" -> "I have been"
    expect(diffWords('I has been', 'I have been')).toEqual([
      { op: 'equal', text: 'I ' },
      { op: 'delete', text: 'has' },
      { op: 'insert', text: 'have' },
      { op: 'equal', text: ' been' },
    ])
  })

  it('preserves newlines as equal whitespace', () => {
    const segs = diffWords('a\n\nb', 'a\n\nc')
    expect(segs).toEqual([
      { op: 'equal', text: 'a\n\n' },
      { op: 'delete', text: 'b' },
      { op: 'insert', text: 'c' },
    ])
  })

  it('reconstructs the originals from the segments', () => {
    const before = 'Dear team, I have 5 year of experience.'
    const after = 'Dear hiring team, I have five years of experience.'
    const segs = diffWords(before, after)
    const reBefore = segs.filter((s) => s.op !== 'insert').map((s) => s.text).join('')
    const reAfter = segs.filter((s) => s.op !== 'delete').map((s) => s.text).join('')
    expect(reBefore).toBe(before)
    expect(reAfter).toBe(after)
  })
})
