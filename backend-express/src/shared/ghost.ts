export const GHOST_STALE_DAYS = 7
export const GHOST_GHOST_DAYS = 14

export type GhostFilter = 'all' | 'active' | 'stale' | 'ghost' | undefined

const DAY_MS = 86_400_000

/** Days of inactivity, derived from the last activity (or creation) date. */
export function deriveGhostDays(job: { lastActivityAt: Date | null; createdAt: Date }, now: number): number {
  const activity = (job.lastActivityAt ?? job.createdAt).getTime()
  return Math.max(0, Math.floor((now - activity) / DAY_MS))
}
