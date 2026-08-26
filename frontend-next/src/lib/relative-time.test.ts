import { describe, it, expect } from 'vitest'
import { relativeTime, shortDate, dayKey, dayGroupLabel, isPast } from './relative-time'

describe('isPast', () => {
  const now = new Date('2026-06-03T12:00:00.000Z')

  it('is true for a timestamp before now', () => {
    expect(isPast('2026-06-03T11:59:59.000Z', now)).toBe(true)
  })
  it('is false for a timestamp after now', () => {
    expect(isPast('2026-06-03T12:00:01.000Z', now)).toBe(false)
  })
  it('is false for an invalid timestamp', () => {
    expect(isPast('nope', now)).toBe(false)
  })
  it('defaults to the current clock', () => {
    expect(isPast('2000-01-01T00:00:00.000Z')).toBe(true)
    expect(isPast('2099-01-01T00:00:00.000Z')).toBe(false)
  })
})

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

// Day bucketing is intentionally local-time (it groups what the user sees), so
// build fixtures from local Date components rather than UTC `Z` strings to keep
// these assertions independent of the test runner's timezone.
const localIso = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).toISOString()

describe('dayKey', () => {
  it('buckets two timestamps on the same calendar day together', () => {
    expect(dayKey(localIso(2026, 6, 3, 1))).toBe(dayKey(localIso(2026, 6, 3, 23)))
  })
  it('separates different calendar days', () => {
    expect(dayKey(localIso(2026, 6, 3))).not.toBe(dayKey(localIso(2026, 6, 4)))
  })
  it('returns an empty string for invalid input', () => {
    expect(dayKey('nope')).toBe('')
  })
})

describe('dayGroupLabel', () => {
  const now = new Date(2026, 5, 18, 12) // Thu, Jun 18 2026 (local)

  it('labels the current day "Today"', () => {
    expect(dayGroupLabel(localIso(2026, 6, 18, 3), now)).toBe('Today')
  })
  it('labels the prior day "Yesterday"', () => {
    expect(dayGroupLabel(localIso(2026, 6, 17, 20), now)).toBe('Yesterday')
  })
  it('labels a day within the past week by weekday', () => {
    expect(dayGroupLabel(localIso(2026, 6, 15), now)).toBe('Monday')
  })
  it('labels older days with a full date', () => {
    expect(dayGroupLabel(localIso(2026, 5, 28), now)).toMatch(/May\s+28,\s+2026/)
  })
})
