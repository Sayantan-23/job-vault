'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { StatusChip } from '@/components/kanban/status-chip'
import { GhostMeter } from '@/components/kanban/ghost-meter'
import { shortDate } from '@/lib/relative-time'
import type { Job } from '@/types/job'
import type { SortField, SortOrder } from '@/types/filters'

// Mobile keeps Title / Company / Status / Ghost; Location + Added appear at md+
// (their cells are `hidden md:*`, and the grid template gains the two columns at md).
// Every column gets a proportional `fr` share so the row width is distributed
// evenly — text columns can shrink+truncate (minmax(0,…)); the metadata columns
// keep a content-floor (minmax(<rem>,…)) so the chip/meter/date never clip. This
// stops the slack piling into one flexible column and clustering the rest at the edge.
const GRID =
  'grid grid-cols-[minmax(0,2.5fr)_minmax(0,2fr)_minmax(7rem,1fr)_minmax(5rem,0.8fr)] md:grid-cols-[minmax(0,2.5fr)_minmax(0,2fr)_minmax(0,1.5fr)_minmax(7rem,1fr)_minmax(5rem,0.8fr)_minmax(5rem,0.8fr)] items-center gap-4'

function SortHeader({
  label,
  field,
  sortBy,
  sortOrder,
  onSort,
  className,
}: {
  label: string
  field: SortField
  sortBy: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
  className?: string
}) {
  const active = sortBy === field
  const Icon = sortOrder === 'asc' ? ArrowUp : ArrowDown
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn('inline-flex items-center gap-1 text-left transition-colors hover:text-foreground', active ? 'text-foreground' : '', className)}
    >
      {label}
      {active ? <Icon className="size-3" aria-label={sortOrder === 'asc' ? 'sorted ascending' : 'sorted descending'} /> : null}
    </button>
  )
}

function Header({ sortBy, sortOrder, onSort }: { sortBy: SortField; sortOrder: SortOrder; onSort: (f: SortField) => void }) {
  return (
    <div className={cn(GRID, 'border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground')}>
      <SortHeader label="Title" field="title" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
      <SortHeader label="Company" field="company" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
      <span className="hidden md:block">Location</span>
      <span>Status</span>
      <SortHeader label="Ghost" field="lastActivityAt" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
      <SortHeader label="Added" field="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} className="hidden md:inline-flex" />
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border border-border">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse border-b border-border bg-muted/30 last:border-b-0" />
      ))}
    </div>
  )
}

function EmptyState({ filtered, onReset }: { filtered: boolean; onReset: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center">
      {filtered ? (
        <>
          <p className="text-sm font-medium">No jobs match your filters</p>
          <p className="mt-1 text-sm text-muted-foreground">Try widening or clearing them.</p>
          <Button type="button" variant="outline" size="sm" onClick={onReset} className="mt-4">Reset filters</Button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">No jobs yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Add your first application to start tracking it.</p>
        </>
      )}
    </div>
  )
}

export function JobsTable({
  jobs,
  sortBy,
  sortOrder,
  onSort,
  loading,
  isFiltered,
  onReset,
}: {
  jobs: Job[]
  sortBy: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
  loading: boolean
  isFiltered: boolean
  onReset: () => void
}) {
  const searchParams = useSearchParams()
  const hrefFor = (id: string) => {
    const p = new URLSearchParams(searchParams.toString())
    p.set('job', id)
    return `/app/jobs?${p.toString()}`
  }

  if (loading && jobs.length === 0) return <TableSkeleton />
  if (jobs.length === 0) return <EmptyState filtered={isFiltered} onReset={onReset} />

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <Header sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
      <ul className="divide-y divide-border">
        {jobs.map((job) => (
          <li key={job.id}>
            <Link href={hrefFor(job.id)} scroll={false} className={cn(GRID, 'px-4 py-3 text-sm transition-colors hover:bg-accent')}>
              <span className="truncate font-medium">{job.title}</span>
              <span className="truncate text-muted-foreground">{job.company}</span>
              <span className="hidden truncate text-muted-foreground md:block">{job.location ?? '—'}</span>
              <StatusChip status={job.status} />
              <GhostMeter days={job.ghostDays} />
              <span className="hidden font-mono text-xs tabular-nums text-muted-foreground md:block">{shortDate(job.createdAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
