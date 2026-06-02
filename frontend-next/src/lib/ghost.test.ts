import { describe, it, expect } from 'vitest'
import { ghostLevel, ghostLabel, GHOST_ACTIVE_MAX, GHOST_STALE_MAX } from './ghost'

describe('ghostLevel', () => {
  it('returns "active" at and below the active threshold', () => {
    expect(ghostLevel(0)).toBe('active')
    expect(ghostLevel(GHOST_ACTIVE_MAX)).toBe('active')
  })
  it('returns "stale" between active and stale thresholds', () => {
    expect(ghostLevel(GHOST_ACTIVE_MAX + 1)).toBe('stale')
    expect(ghostLevel(GHOST_STALE_MAX)).toBe('stale')
  })
  it('returns "ghosted" above the stale threshold', () => {
    expect(ghostLevel(GHOST_STALE_MAX + 1)).toBe('ghosted')
  })
})

describe('ghostLabel', () => {
  it('describes activity recency', () => {
    expect(ghostLabel(0)).toBe('Active today')
    expect(ghostLabel(1)).toBe('Last activity: 1 day ago')
    expect(ghostLabel(5)).toBe('Last activity: 5 days ago')
    expect(ghostLabel(100)).toBe('Last activity: 100 days ago')
  })
})
