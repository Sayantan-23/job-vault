export const GHOST_ACTIVE_MAX = 7
export const GHOST_STALE_MAX = 14

export type GhostLevel = 'active' | 'stale' | 'ghosted'

export function ghostLevel(days: number): GhostLevel {
  if (days <= GHOST_ACTIVE_MAX) return 'active'
  if (days <= GHOST_STALE_MAX) return 'stale'
  return 'ghosted'
}

export function ghostLabel(days: number): string {
  if (days === 0) return 'Active today'
  if (days === 1) return 'Last activity: 1 day ago'
  return `Last activity: ${days} days ago`
}
