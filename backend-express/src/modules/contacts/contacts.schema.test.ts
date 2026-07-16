import { describe, it, expect } from 'vitest'
import { CreateContactSchema, UpdateContactSchema } from './contacts.schema.js'

describe('CreateContactSchema', () => {
  it('accepts a minimal payload and trims contact', () => {
    const parsed = CreateContactSchema.parse({ contact: '  Priya — priya@acme.com  ' })
    expect(parsed.contact).toBe('Priya — priya@acme.com')
    expect(parsed.channel).toBeUndefined()
  })

  it('accepts channel, reachedOutAt and notes', () => {
    const parsed = CreateContactSchema.parse({
      contact: 'linkedin.com/in/priya',
      channel: 'LINKEDIN',
      reachedOutAt: '2026-07-01T00:00:00Z',
      notes: 'Met at conference',
    })
    expect(parsed.channel).toBe('LINKEDIN')
    expect(parsed.reachedOutAt).toEqual(new Date('2026-07-01T00:00:00Z'))
  })

  it('rejects empty contact, unknown channel, and >500 chars', () => {
    expect(CreateContactSchema.safeParse({ contact: '   ' }).success).toBe(false)
    expect(CreateContactSchema.safeParse({ contact: 'x', channel: 'PHONE' }).success).toBe(false)
    expect(CreateContactSchema.safeParse({ contact: 'x'.repeat(501) }).success).toBe(false)
  })

  it('does not accept status on create', () => {
    const parsed = CreateContactSchema.parse({ contact: 'x', status: 'REFERRED' })
    expect('status' in parsed).toBe(false)
  })
})

describe('UpdateContactSchema', () => {
  it('accepts a partial patch', () => {
    const parsed = UpdateContactSchema.parse({ status: 'HEARD_BACK' })
    expect(parsed.status).toBe('HEARD_BACK')
  })

  it('allows clearing channel and notes with null', () => {
    const parsed = UpdateContactSchema.parse({ channel: null, notes: null })
    expect(parsed.channel).toBeNull()
    expect(parsed.notes).toBeNull()
  })

  it('rejects an empty patch and an unknown status', () => {
    expect(UpdateContactSchema.safeParse({}).success).toBe(false)
    expect(UpdateContactSchema.safeParse({ status: 'MAYBE' }).success).toBe(false)
  })
})
