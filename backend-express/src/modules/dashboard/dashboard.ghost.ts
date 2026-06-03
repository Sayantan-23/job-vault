import { GHOST_STALE_DAYS, GHOST_GHOST_DAYS, deriveGhostDays, type GhostFilter } from '@/shared/ghost.js'

export { deriveGhostDays }

export function passesGhostFilter(ghostDays: number, filter: GhostFilter): boolean {
  switch (filter) {
    case 'active':
      return ghostDays <= GHOST_STALE_DAYS
    case 'stale':
      return ghostDays > GHOST_STALE_DAYS && ghostDays <= GHOST_GHOST_DAYS
    case 'ghost':
      return ghostDays > GHOST_GHOST_DAYS
    default:
      return true
  }
}
