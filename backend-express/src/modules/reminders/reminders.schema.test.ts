import { describe, it, expect } from 'vitest'
import { CreateReminderSchema, UpdateReminderSchema, ReminderIdParamSchema } from './reminders.schema.js'

describe('CreateReminderSchema', () => {
  it('coerces remindAt to a Date', () => {
    const parsed = CreateReminderSchema.parse({ message: 'Ping recruiter', remindAt: '2026-06-20T12:00:00Z' })
    expect(parsed.message).toBe('Ping recruiter')
    expect(parsed.remindAt).toBeInstanceOf(Date)
  })
  it('rejects an empty message', () => {
    expect(CreateReminderSchema.safeParse({ message: '', remindAt: '2026-06-20T12:00:00Z' }).success).toBe(false)
  })
  it('rejects a message over 500 chars', () => {
    expect(CreateReminderSchema.safeParse({ message: 'x'.repeat(501), remindAt: '2026-06-20T12:00:00Z' }).success).toBe(false)
  })
  it('rejects an invalid remindAt', () => {
    expect(CreateReminderSchema.safeParse({ message: 'hi', remindAt: 'not-a-date' }).success).toBe(false)
  })
})

describe('UpdateReminderSchema', () => {
  it('accepts a partial patch', () => {
    expect(UpdateReminderSchema.parse({ isCompleted: true })).toEqual({ isCompleted: true })
  })
  it('coerces remindAt when present', () => {
    const parsed = UpdateReminderSchema.parse({ remindAt: '2026-07-01T00:00:00Z' })
    expect(parsed.remindAt).toBeInstanceOf(Date)
  })
})

describe('ReminderIdParamSchema', () => {
  it('requires a uuid id', () => {
    expect(ReminderIdParamSchema.safeParse({ id: 'nope' }).success).toBe(false)
    expect(ReminderIdParamSchema.safeParse({ id: '00000000-0000-0000-0000-000000000000' }).success).toBe(true)
  })
})
