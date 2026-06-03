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
import { cn } from '@/lib/utils'
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

  return (
    <>
      {/* Board view fills the available height (each column scrolls its own cards);
          list view flows naturally and the main region scrolls. */}
      <section className={cn('flex flex-col gap-5', view === 'board' && 'h-full')}>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h1 className="text-xl font-semibold">Jobs</h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-mono tabular-nums">{jobs.length}</span> tracked
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SegmentedControl value={view} onValueChange={setView} options={VIEW_OPTIONS} aria-label="Switch view" />
            <Button type="button" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Add job
            </Button>
          </div>
        </div>

        {view === 'board' ? (
          <div className="min-h-0 flex-1">
            <KanbanBoard board={initialBoard} />
          </div>
        ) : (
          <JobsList jobs={jobs} />
        )}
      </section>

      <AddJobModal open={addOpen} onOpenChange={setAddOpen} />
      <JobDrawer jobId={jobId} />
    </>
  )
}
