import { describe, it, expect } from 'vitest'
import { GHOST_STALE_DAYS, GHOST_GHOST_DAYS, deriveGhostDays } from './ghost.js'

const NOW = new Date('2026-06-20T12:00:00Z').getTime()
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000)

describe('shared ghost constants', () => {
  it('exposes the 7/14-day thresholds', () => {
    expect(GHOST_STALE_DAYS).toBe(7)
    expect(GHOST_GHOST_DAYS).toBe(14)
  })
})

describe('deriveGhostDays', () => {
  it('is 0 for activity today', () => {
    expect(deriveGhostDays({ lastActivityAt: daysAgo(0), createdAt: daysAgo(30) }, NOW)).toBe(0)
  })
  it('counts whole days since lastActivityAt', () => {
    expect(deriveGhostDays({ lastActivityAt: daysAgo(9), createdAt: daysAgo(30) }, NOW)).toBe(9)
  })
  it('falls back to createdAt when lastActivityAt is null', () => {
    expect(deriveGhostDays({ lastActivityAt: null, createdAt: daysAgo(20) }, NOW)).toBe(20)
  })
  it('never returns negative', () => {
    expect(deriveGhostDays({ lastActivityAt: new Date(NOW + 86_400_000), createdAt: daysAgo(1) }, NOW)).toBe(0)
  })
})
