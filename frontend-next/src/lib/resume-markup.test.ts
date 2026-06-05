import { describe, it, expect } from 'vitest'
import { splitBold } from './resume-markup'

describe('splitBold', () => {
  it('splits **bold** runs', () => {
    expect(splitBold('a **b** c')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c', bold: false },
    ])
  })
  it('returns a single plain run when no markup', () => {
    expect(splitBold('plain')).toEqual([{ text: 'plain', bold: false }])
  })
})
