import { describe, it, expect } from 'vitest'
import { CreateAnswerSchema, UpdateAnswerSchema, GenerateAnswerSchema } from './answers.schema.js'

const UUID = '11111111-1111-4111-8111-111111111111'

describe('CreateAnswerSchema', () => {
  it('accepts a question with only a short variant', () => {
    const parsed = CreateAnswerSchema.parse({ question: 'Why are you leaving?', answerShort: 'Growth.' })
    expect(parsed.answerShort).toBe('Growth.')
    expect(parsed.answerLong).toBeUndefined()
  })

  it('accepts a question with only a long variant', () => {
    expect(() => CreateAnswerSchema.parse({ question: 'Why?', answerLong: 'Because.' })).not.toThrow()
  })

  it('rejects a question with neither variant', () => {
    expect(() => CreateAnswerSchema.parse({ question: 'Why?' })).toThrow()
  })

  it('rejects a question whose variants are both whitespace', () => {
    expect(() => CreateAnswerSchema.parse({ question: 'Why?', answerShort: '   ', answerLong: '' })).toThrow()
  })

  it('rejects an empty question', () => {
    expect(() => CreateAnswerSchema.parse({ question: '  ', answerShort: 'x' })).toThrow()
  })

  it('rejects a question over 500 characters', () => {
    expect(() => CreateAnswerSchema.parse({ question: 'q'.repeat(501), answerShort: 'x' })).toThrow()
  })
})

describe('UpdateAnswerSchema', () => {
  it('accepts a single-field patch', () => {
    expect(UpdateAnswerSchema.parse({ answerLong: 'new' }).answerLong).toBe('new')
  })

  it('accepts clearing one variant to empty while the other stands', () => {
    expect(() => UpdateAnswerSchema.parse({ answerShort: '' })).not.toThrow()
  })

  it('rejects an empty patch', () => {
    expect(() => UpdateAnswerSchema.parse({})).toThrow()
  })
})

describe('GenerateAnswerSchema', () => {
  it('accepts a question with a persona', () => {
    expect(() => GenerateAnswerSchema.parse({ question: 'Why?', personaId: UUID })).not.toThrow()
  })

  it('accepts an optional jobId and instructions', () => {
    const parsed = GenerateAnswerSchema.parse({ question: 'Why?', personaId: UUID, jobId: UUID, instructions: 'Be blunt' })
    expect(parsed.jobId).toBe(UUID)
  })

  it('rejects a non-uuid personaId', () => {
    expect(() => GenerateAnswerSchema.parse({ question: 'Why?', personaId: 'nope' })).toThrow()
  })
})
