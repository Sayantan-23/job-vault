import { describe, it, expect } from 'vitest'
import { relativeTime, shortDate } from './relative-time'

describe('relativeTime', () => {
  const now = new Date('2026-06-03T12:00:00.000Z')

  it('renders "just now" for under a minute', () => {
    expect(relativeTime('2026-06-03T11:59:30.000Z', now)).toBe('just now')
  })

  it('renders minutes', () => {
    expect(relativeTime('2026-06-03T11:45:00.000Z', now)).toBe('15 minutes ago')
  })

  it('renders hours', () => {
    expect(relativeTime('2026-06-03T09:00:00.000Z', now)).toBe('3 hours ago')
  })

  it('renders days', () => {
    expect(relativeTime('2026-06-01T12:00:00.000Z', now)).toBe('2 days ago')
  })
})

describe('shortDate', () => {
  it('formats an ISO date as "Mon D"', () => {
    expect(shortDate('2026-05-28T10:00:00.000Z')).toMatch(/May\s+28/)
  })
  it('returns an em dash for empty/invalid input', () => {
    expect(shortDate('')).toBe('—')
    expect(shortDate('not-a-date')).toBe('—')
  })
})
