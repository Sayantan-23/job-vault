'use client'

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { LayoutGrid, List, Plus } from 'lucide-react'
import { useJobs } from '@/hooks/use-jobs'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { JobsList } from './jobs-list'
import { AddJobModal } from './add-job-modal'
import { JobDrawer } from './job-drawer'
import { PageHeader } from '@/components/layout/app/page-header'
import { NotificationBell } from '@/components/notifications/notification-bell'
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
  initialJobs: Job[]
  initialBoard: Board
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const viewParam = searchParams.get('view')
  const view: View = isView(viewParam) ? viewParam : 'list'
  const jobId = searchParams.get('job')

  const { data: jobs = [] } = useJobs(initialJobs)
  const [addOpen, setAddOpen] = useState(false)

  function setView(next: View) {
    const params = new URLSearchParams(searchParams)
    if (next === 'list') params.delete('view')
    else params.set('view', next)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const actions = (
    <>
      <NotificationBell />
      <SegmentedControl value={view} onValueChange={setView} options={VIEW_OPTIONS} aria-label="Switch view" />
      <Button type="button" onClick={() => setAddOpen(true)}>
        <Plus className="size-4" aria-hidden="true" />
        Add job
      </Button>
    </>
  )

  return (
    <>
      {/* Board view fills the available height (each column scrolls its own cards);
          list view flows naturally and its region scrolls. */}
      <div className="flex min-h-0 flex-1 flex-col">
        <PageHeader
          title="Jobs"
          description={
            <>
              <span className="font-mono tabular-nums">{jobs.length}</span> tracked
            </>
          }
          actions={actions}
        />
        {view === 'board' ? (
          <div className="min-h-0 flex-1 p-6">
            <KanbanBoard board={initialBoard} />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <JobsList jobs={jobs} />
          </div>
        )}
      </div>

      <AddJobModal open={addOpen} onOpenChange={setAddOpen} />
      <JobDrawer jobId={jobId} />
    </>
  )
}
