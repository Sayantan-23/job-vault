'use client'

import { useSearchParams } from 'next/navigation'
import { useKanban } from '@/hooks/use-dashboard'
import { DashboardStats } from './dashboard-stats'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { JobDrawer } from '@/components/jobs/job-drawer'
import type { KanbanBoard as Board } from '@/types/dashboard'

export function DashboardView({ initialBoard }: { initialBoard: Board }) {
  const searchParams = useSearchParams()
  const jobId = searchParams.get('job')
  const { data } = useKanban(initialBoard)
  const board = data ?? initialBoard

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <DashboardStats stats={board.stats} />
      <KanbanBoard board={board} />
      <JobDrawer jobId={jobId} />
    </section>
  )
}
