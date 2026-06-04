'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { LayoutGrid, List, Plus } from 'lucide-react'
import { useJobs } from '@/hooks/use-jobs'
import { useKanban } from '@/hooks/use-dashboard'
import { useJobFilters } from '@/hooks/use-job-filters'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { JobsToolbar } from './jobs-toolbar'
import { JobsTable } from './jobs-table'
import { JobsPagination } from './jobs-pagination'
import { AddJobModal } from './add-job-modal'
import { JobDrawer } from './job-drawer'
import { PageHeader } from '@/components/layout/app/page-header'
import { NotificationBell } from '@/components/notifications/notification-bell'
import type { Paginated } from '@/types/filters'
import type { Job } from '@/types/job'
import type { KanbanBoard as Board } from '@/types/dashboard'

type View = 'board' | 'list'

const VIEW_OPTIONS = [
  { value: 'board', label: 'Board', icon: LayoutGrid },
  { value: 'list', label: 'List', icon: List },
] as const

function isView(value: string | null): value is View {
  return value === 'board' || value === 'list'
}

export function JobsWorkspace({
  initialJobs,
  initialBoard,
}: {
  initialJobs: Paginated<Job>
  initialBoard: Board
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view: View = isView(searchParams.get('view')) ? (searchParams.get('view') as View) : 'list'
  const jobId = searchParams.get('job')

  const {
    filters, isBoardFiltered, isListFiltered,
    setSearch, setStatus, setGhost, setDateRange, cycleSort, setPage, resetAll,
  } = useJobFilters()
  const boardFilters = { search: filters.search, ghost: filters.ghost }

  const listQuery = useJobs(filters, initialJobs)
  const page = listQuery.data ?? initialJobs
  const boardQuery = useKanban(boardFilters, initialBoard, view === 'board')
  const board = boardQuery.data ?? initialBoard

  const [addOpen, setAddOpen] = useState(false)

  function setView(next: View) {
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'list') params.delete('view')
    else params.set('view', next)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const count = view === 'board' ? board.stats.totalJobs : page.meta.total
  const filtered = view === 'board' ? isBoardFiltered : isListFiltered
  const showReset = isListFiltered || filters.sortBy !== 'createdAt' || filters.sortOrder !== 'desc' || filters.page > 1

  const actions = (
    <>
      <JobsToolbar filters={filters} showReset={showReset} onSearch={setSearch} onGhost={setGhost} onReset={resetAll} />
      {/* primary page actions; the flex-1 search above pushes them to the right. hairline divides them from the filters */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden h-6 w-px bg-border lg:block" aria-hidden="true" />
        <SegmentedControl value={view} onValueChange={setView} options={VIEW_OPTIONS} aria-label="Switch view" />
        <Button type="button" onClick={() => setAddOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Add job
        </Button>
        <NotificationBell />
      </div>
    </>
  )

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeader
          title="Jobs"
          description={
            <>
              <span className="font-mono tabular-nums">{count}</span> {filtered ? 'matching' : 'tracked'}
            </>
          }
          actions={actions}
        />
        {view === 'board' ? (
          <div className="min-h-0 flex-1 p-6">
            <KanbanBoard board={board} filters={boardFilters} isFiltered={isBoardFiltered} />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <JobsTable
              jobs={page.data}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSort={cycleSort}
              loading={listQuery.isLoading}
              isFiltered={isListFiltered}
              onReset={resetAll}
              status={filters.status}
              onStatus={setStatus}
              createdFrom={filters.createdFrom}
              createdTo={filters.createdTo}
              onDateRange={setDateRange}
            />
            <JobsPagination meta={page.meta} onPage={setPage} />
          </div>
        )}
      </div>

      <AddJobModal open={addOpen} onOpenChange={setAddOpen} />
      <JobDrawer jobId={jobId} />
    </>
  )
}
