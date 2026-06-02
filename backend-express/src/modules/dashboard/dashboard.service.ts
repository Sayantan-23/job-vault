import { JOB_STATUSES, type JobStatus, type JobRow } from '@/db/schema/jobs.js'
import { dashboardRepository } from './dashboard.repository.js'
import { deriveGhostDays, passesGhostFilter } from './dashboard.ghost.js'
import type {
  DashboardQueryInput,
  KanbanBoardResponse,
  KanbanCard,
  KanbanColumn,
  DashboardStats,
} from './dashboard.schema.js'

function toCard(row: JobRow, ghostDays: number): KanbanCard {
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    ghostDays,
    status: row.status,
    kanbanOrder: row.kanbanOrder,
    lastActivityAt: row.lastActivityAt,
    createdAt: row.createdAt,
  }
}

function emptyByStatus(): Record<JobStatus, number> {
  return { WISHLIST: 0, APPLIED: 0, INTERVIEWING: 0, OFFER: 0, REJECTED: 0, ARCHIVED: 0 }
}

function buildColumns(cards: KanbanCard[]): KanbanColumn[] {
  // Repo already ordered rows by kanbanOrder asc, so per-status order is preserved.
  return JOB_STATUSES.map((status) => ({
    status,
    jobs: cards.filter((c) => c.status === status),
  }))
}

function calculateStats(cards: KanbanCard[]): DashboardStats {
  const byStatus = emptyByStatus()
  for (const card of cards) byStatus[card.status] += 1
  return {
    totalJobs: cards.length,
    byStatus,
    ghostAlerts: cards.filter((c) => c.ghostDays > 14).length,
    recentActivity: cards.filter((c) => c.ghostDays <= 7).length,
  }
}

async function getKanban(userId: string, query: DashboardQueryInput): Promise<KanbanBoardResponse> {
  const filters: { search?: string; status?: JobStatus } = {}
  if (query.search !== undefined) filters.search = query.search
  if (query.status !== undefined) filters.status = query.status

  const rows = await dashboardRepository.findForUser(userId, filters)
  const now = Date.now()
  const cards = rows
    .map((row) => toCard(row, deriveGhostDays(row, now)))
    .filter((card) => passesGhostFilter(card.ghostDays, query.ghostFilter))

  return { columns: buildColumns(cards), stats: calculateStats(cards) }
}

async function getStats(userId: string): Promise<DashboardStats> {
  const rows = await dashboardRepository.findForUser(userId, {})
  const now = Date.now()
  const cards = rows.map((row) => toCard(row, deriveGhostDays(row, now)))
  return calculateStats(cards)
}

export const dashboardService = { getKanban, getStats }
