import { describe, it, expect } from 'vitest'
import { deriveGhostDays, passesGhostFilter } from './dashboard.ghost.js'

const NOW = new Date('2026-06-20T12:00:00Z').getTime()
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000)

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

describe('passesGhostFilter', () => {
  it('passes everything for all/undefined', () => {
    expect(passesGhostFilter(99, undefined)).toBe(true)
    expect(passesGhostFilter(99, 'all')).toBe(true)
  })
  it('active = <=7', () => {
    expect(passesGhostFilter(7, 'active')).toBe(true)
    expect(passesGhostFilter(8, 'active')).toBe(false)
  })
  it('stale = 8..14', () => {
    expect(passesGhostFilter(8, 'stale')).toBe(true)
    expect(passesGhostFilter(14, 'stale')).toBe(true)
    expect(passesGhostFilter(15, 'stale')).toBe(false)
    expect(passesGhostFilter(7, 'stale')).toBe(false)
  })
  it('ghost = >14', () => {
    expect(passesGhostFilter(15, 'ghost')).toBe(true)
    expect(passesGhostFilter(14, 'ghost')).toBe(false)
  })
})
