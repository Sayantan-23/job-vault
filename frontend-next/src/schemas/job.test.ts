import { describe, it, expect } from 'vitest'
import { ManualJobSchema, ScrapeUrlSchema } from './job'

describe('ManualJobSchema', () => {
  it('accepts a minimal job', () => {
    expect(ManualJobSchema.safeParse({ title: 'SWE', company: 'Acme' }).success).toBe(true)
  })
  it('requires title and company', () => {
    expect(ManualJobSchema.safeParse({ title: '', company: '' }).success).toBe(false)
  })
  it('accepts an empty sourceUrl but rejects a malformed one', () => {
    expect(ManualJobSchema.safeParse({ title: 'a', company: 'b', sourceUrl: '' }).success).toBe(true)
    expect(ManualJobSchema.safeParse({ title: 'a', company: 'b', sourceUrl: 'nope' }).success).toBe(false)
  })
})

describe('ScrapeUrlSchema', () => {
  it('requires a valid URL', () => {
    expect(ScrapeUrlSchema.safeParse({ sourceUrl: 'https://x.com/j' }).success).toBe(true)
    expect(ScrapeUrlSchema.safeParse({ sourceUrl: 'x' }).success).toBe(false)
  })
})
