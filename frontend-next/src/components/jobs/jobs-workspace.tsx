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

  const { filters, isFiltered, setSearch, setStatus, setGhost, setSort, setPage, resetAll } = useJobFilters()
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

  const actions = (
    <>
      <JobsToolbar
        view={view}
        filters={filters}
        isFiltered={isFiltered}
        onSearch={setSearch}
        onStatus={setStatus}
        onGhost={setGhost}
        onSort={setSort}
        onReset={resetAll}
      />
      {/* hairline separating the filter group from the primary page actions */}
      <div className="hidden h-6 w-px bg-border lg:block" aria-hidden="true" />
      <SegmentedControl value={view} onValueChange={setView} options={VIEW_OPTIONS} aria-label="Switch view" />
      <Button type="button" onClick={() => setAddOpen(true)}>
        <Plus className="size-4" aria-hidden="true" />
        Add job
      </Button>
      <NotificationBell />
    </>
  )

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeader
          title="Jobs"
          description={
            <>
              <span className="font-mono tabular-nums">{count}</span> {isFiltered ? 'matching' : 'tracked'}
            </>
          }
          actions={actions}
        />
        {view === 'board' ? (
          <div className="min-h-0 flex-1 p-6">
            <KanbanBoard board={board} filters={boardFilters} isFiltered={isFiltered} />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <JobsTable
              jobs={page.data}
              sortBy={filters.sortBy}
              sortOrder={filters.sortOrder}
              onSort={setSort}
              loading={listQuery.isLoading}
              isFiltered={isFiltered}
              onReset={resetAll}
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
