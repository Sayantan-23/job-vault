'use client'

import { useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { LayoutGrid, List, Plus } from 'lucide-react'
import { useJobs } from '@/hooks/use-jobs'
import { useKanban, useStats } from '@/hooks/use-dashboard'
import { useJobFilters } from '@/hooks/use-job-filters'
import { replaceUrl } from '@/lib/url-state'
import { EMPTY_BOARD, EMPTY_JOBS_PAGE, EMPTY_STATS } from '@/lib/dashboard-defaults'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { PageHeading } from '@/components/layout/app/page-heading'
import { InlineStats } from '@/components/dashboard/inline-stats'
import { JobsToolbar } from './jobs-toolbar'
import { JobsListControls } from './jobs-list-controls'
import { JobList } from './job-list'
import { JobsPagination } from './jobs-pagination'
import { AddJobModal } from './add-job-modal'
import { JobDrawer } from './job-drawer'

type View = 'board' | 'list'

const VIEW_OPTIONS = [
  { value: 'board', label: 'Board', icon: LayoutGrid },
  { value: 'list', label: 'List', icon: List },
] as const

function isView(value: string | null): value is View {
  return value === 'board' || value === 'list'
}

export function JobsWorkspace() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const view: View = isView(searchParams.get('view')) ? (searchParams.get('view') as View) : 'list'
  const jobId = searchParams.get('job')

  const {
    filters, isBoardFiltered, isListFiltered,
    setSearch, setGhost, applyFilters, cycleSort, setPage, resetAll,
  } = useJobFilters()
  const boardFilters = { search: filters.search, ghost: filters.ghost }

  const listQuery = useJobs(filters)
  const page = listQuery.data ?? EMPTY_JOBS_PAGE
  const boardQuery = useKanban(boardFilters, view === 'board')
  const board = boardQuery.data ?? EMPTY_BOARD
  const { data: stats = EMPTY_STATS } = useStats()

  const [addOpen, setAddOpen] = useState(false)

  function setView(next: View) {
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'list') params.delete('view')
    else params.set('view', next)
    const qs = params.toString()
    // Client-side only: the view is presentation state and React Query owns the
    // board, so re-running the page on the server would buy nothing.
    replaceUrl(qs ? `${pathname}?${qs}` : pathname)
  }

  const showReset = isListFiltered || filters.sortBy !== 'createdAt' || filters.sortOrder !== 'desc' || filters.page > 1

  const actions = (
    <>
      <JobsToolbar filters={filters} showReset={showReset} onSearch={setSearch} onGhost={setGhost} onReset={resetAll} />
      {/* primary page actions; the flex-1 search above pushes them to the right. hairline divides them from the filters */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="hidden h-6 w-px bg-border lg:block" aria-hidden="true" />
        <SegmentedControl value={view} onValueChange={setView} options={VIEW_OPTIONS} aria-label="Switch view" collapseLabels />
        <Button type="button" onClick={() => setAddOpen(true)} aria-label="Add job">
          <Plus className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Add job</span>
        </Button>
      </div>
    </>
  )

  return (
    <>
      {view === 'board' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="jv-content-col w-full shrink-0 px-6 pt-10 sm:px-8 lg:px-10">
            <PageHeading
              title="Jobs"
              description={
                <div className="flex flex-wrap items-center gap-x-7 gap-y-1.5">
                  <InlineStats stats={stats} />
                  {isBoardFiltered ? (
                    <span className="text-sm text-muted-foreground">
                      <span className="font-mono tabular-nums">{board.stats.totalJobs}</span> matching
                    </span>
                  ) : null}
                </div>
              }
              actions={actions}
            />
          </div>
          <div className="min-h-0 jv-content-col w-full flex-1 px-6 pb-6 sm:px-8 lg:px-10">
            <KanbanBoard board={board} filters={boardFilters} isFiltered={isBoardFiltered} loading={boardQuery.isLoading} />
          </div>
        </div>
      ) : (
        <div className="jv-content-col w-full px-6 py-10 sm:px-8 lg:px-10">
          <PageHeading
            title="Jobs"
            description={
              <div className="flex flex-wrap items-center gap-x-7 gap-y-1.5">
                <InlineStats stats={stats} />
                {isListFiltered ? (
                  <span className="text-sm text-muted-foreground">
                    <span className="font-mono tabular-nums">{page.meta.total}</span> matching
                  </span>
                ) : null}
              </div>
            }
            actions={actions}
          />
          <JobsListControls
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onSort={cycleSort}
            status={filters.status}
            createdFrom={filters.createdFrom}
            createdTo={filters.createdTo}
            onApplyFilters={applyFilters}
          />
          <JobList
            jobs={page.data}
            loading={listQuery.isLoading}
            isFiltered={isListFiltered}
            onReset={resetAll}
          />
          <JobsPagination meta={page.meta} onPage={setPage} />
        </div>
      )}

      <AddJobModal open={addOpen} onOpenChange={setAddOpen} />
      <JobDrawer jobId={jobId} />
    </>
  )
}
