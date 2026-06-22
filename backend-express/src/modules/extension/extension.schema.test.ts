import { describe, it, expect } from 'vitest'
import { QuickCreateJobSchema, CheckUrlSchema } from './extension.schema.js'

describe('QuickCreateJobSchema', () => {
  it('requires title and company', () => {
    expect(QuickCreateJobSchema.safeParse({ company: 'C' }).success).toBe(false)
    expect(QuickCreateJobSchema.safeParse({ title: 'T' }).success).toBe(false)
    expect(QuickCreateJobSchema.safeParse({ title: 'T', company: 'C' }).success).toBe(true)
  })
  it('rejects an invalid sourceUrl but allows it to be omitted', () => {
    expect(QuickCreateJobSchema.safeParse({ title: 'T', company: 'C', sourceUrl: 'not-a-url' }).success).toBe(false)
    expect(QuickCreateJobSchema.safeParse({ title: 'T', company: 'C', sourceUrl: 'https://x.com/j' }).success).toBe(true)
  })
  it('trims title and company', () => {
    expect(QuickCreateJobSchema.parse({ title: '  T  ', company: '  C  ' })).toMatchObject({ title: 'T', company: 'C' })
  })
})

describe('CheckUrlSchema', () => {
  it('requires a valid url', () => {
    expect(CheckUrlSchema.safeParse({ url: 'https://x.com/j' }).success).toBe(true)
    expect(CheckUrlSchema.safeParse({ url: 'nope' }).success).toBe(false)
    expect(CheckUrlSchema.safeParse({}).success).toBe(false)
  })
})
