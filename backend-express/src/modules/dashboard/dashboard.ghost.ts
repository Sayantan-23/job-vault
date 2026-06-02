import type { DashboardQueryInput } from './dashboard.schema.js'

const DAY_MS = 86_400_000

/** Days of inactivity, derived from the last activity (or creation) date. */
export function deriveGhostDays(job: { lastActivityAt: Date | null; createdAt: Date }, now: number): number {
  const activity = (job.lastActivityAt ?? job.createdAt).getTime()
  return Math.max(0, Math.floor((now - activity) / DAY_MS))
}

export function passesGhostFilter(ghostDays: number, filter: DashboardQueryInput['ghostFilter']): boolean {
  switch (filter) {
    case 'active':
      return ghostDays <= 7
    case 'stale':
      return ghostDays > 7 && ghostDays <= 14
    case 'ghost':
      return ghostDays > 14
    default:
      return true
  }
}
