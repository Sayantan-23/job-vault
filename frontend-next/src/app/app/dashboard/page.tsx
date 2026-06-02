import type { Metadata } from 'next'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { DashboardView } from '@/components/dashboard/dashboard-view'
import type { KanbanBoard } from '@/types/dashboard'

export const metadata: Metadata = { title: 'Dashboard' }

const EMPTY_BOARD: KanbanBoard = {
  columns: [
    { status: 'WISHLIST', jobs: [] }, { status: 'APPLIED', jobs: [] }, { status: 'INTERVIEWING', jobs: [] },
    { status: 'OFFER', jobs: [] }, { status: 'REJECTED', jobs: [] }, { status: 'ARCHIVED', jobs: [] },
  ],
  stats: { totalJobs: 0, byStatus: { WISHLIST: 0, APPLIED: 0, INTERVIEWING: 0, OFFER: 0, REJECTED: 0, ARCHIVED: 0 }, ghostAlerts: 0, recentActivity: 0 },
}

export default async function DashboardPage() {
  let initialBoard: KanbanBoard = EMPTY_BOARD
  try {
    initialBoard = await apiServer.get<KanbanBoard>('/api/dashboard/kanban')
  } catch {
    initialBoard = EMPTY_BOARD
  }

  // useSearchParams() in DashboardView requires a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <DashboardView initialBoard={initialBoard} />
    </Suspense>
  )
}
