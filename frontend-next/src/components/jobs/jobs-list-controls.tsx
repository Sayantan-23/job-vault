'use client'

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AnchoredPopover,
  AnchoredPopoverTrigger,
  AnchoredPopoverContent,
} from '@/components/ui/anchored-popover'
import { JobsFilterMenu } from './jobs-filter-menu'
import type { SortField, SortOrder } from '@/types/filters'
import type { JobStatus } from '@/lib/job-status'

// The sort fields the list exposes — mirrors the old table headers (Title /
// Company / Ghost / Added). Ghost sorts on `lastActivityAt`, Added on `createdAt`.
const SORT_OPTIONS: ReadonlyArray<{ field: SortField; label: string }> = [
  { field: 'title', label: 'Title' },
  { field: 'company', label: 'Company' },
  { field: 'lastActivityAt', label: 'Ghost' },
  { field: 'createdAt', label: 'Added' },
]

function SortMenu({
  sortBy,
  sortOrder,
  onSort,
}: {
  sortBy: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
}) {
  const active = SORT_OPTIONS.find((o) => o.field === sortBy)
  const DirIcon = sortOrder === 'asc' ? ArrowUp : ArrowDown
  return (
    <AnchoredPopover>
      <AnchoredPopoverTrigger asChild>
        <button
          type="button"
          aria-label="Sort jobs"
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[state=open]:text-foreground"
        >
          <ArrowUpDown className="size-3.5" aria-hidden="true" />
          {active?.label ?? 'Sort'}
          <DirIcon className="size-3" aria-hidden="true" />
        </button>
      </AnchoredPopoverTrigger>
      <AnchoredPopoverContent align="end" className="w-48">
        <div role="listbox" aria-label="Sort jobs" className="flex flex-col">
          {SORT_OPTIONS.map((o) => {
            const selected = sortBy === o.field
            const RowIcon = sortOrder === 'asc' ? ArrowUp : ArrowDown
            return (
              <button
                key={o.field}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => onSort(o.field)}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent',
                  selected ? 'font-medium' : '',
                )}
              >
                {o.label}
                {selected ? (
                  <RowIcon className="size-4 text-primary" aria-hidden="true" />
                ) : null}
              </button>
            )
          })}
        </div>
      </AnchoredPopoverContent>
    </AnchoredPopover>
  )
}

// A slim, borderless in-content controls row — relocates the status filter, the
// date-added filter, and the sort that used to live in the previous
// table-header sort/filters. It adds no new filter capability; it only re-homes
// the existing controls in a quiet, box-free row above the editorial list. The
// status + date filters are merged into one labeled `JobsFilterMenu` so the row
// reads as a single Filter control + a Sort control (not two bare funnels).
export function JobsListControls({
  sortBy,
  sortOrder,
  onSort,
  status,
  createdFrom,
  createdTo,
  onApplyFilters,
}: {
  sortBy: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
  status: JobStatus | undefined
  createdFrom?: string | undefined
  createdTo?: string | undefined
  onApplyFilters: (next: { status?: JobStatus | undefined; from?: string | undefined; to?: string | undefined }) => void
}) {
  return (
    <div className="mb-3 flex items-center justify-end gap-1 text-sm text-muted-foreground">
      <JobsFilterMenu
        status={status}
        createdFrom={createdFrom}
        createdTo={createdTo}
        onApply={onApplyFilters}
      />
      <SortMenu sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
    </div>
  )
}
