'use client'

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AnchoredPopover,
  AnchoredPopoverTrigger,
  AnchoredPopoverContent,
} from '@/components/ui/anchored-popover'
import { ColumnFunnel } from './column-funnel'
import { StatusFilterMenu } from './status-filter-menu'
import { DateRangeMenu } from './date-range-menu'
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
// the existing controls in a quiet, box-free row above the editorial list.
export function JobsListControls({
  sortBy,
  sortOrder,
  onSort,
  status,
  onStatus,
  createdFrom,
  createdTo,
  onDateRange,
}: {
  sortBy: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
  status: JobStatus | undefined
  onStatus: (value: JobStatus | undefined) => void
  createdFrom?: string | undefined
  createdTo?: string | undefined
  onDateRange: (from?: string, to?: string) => void
}) {
  // The funnels are `persistent` here so they read as available controls at
  // rest — there is no header row to hover in this standalone controls row.
  return (
    <div className="mb-3 flex items-center justify-end gap-2 text-sm text-muted-foreground">
      <ColumnFunnel label="Filter by status" active={status !== undefined} persistent>
        <StatusFilterMenu value={status} onChange={onStatus} />
      </ColumnFunnel>
      <ColumnFunnel
        label="Filter by date added"
        active={createdFrom !== undefined || createdTo !== undefined}
        persistent
      >
        <DateRangeMenu from={createdFrom} to={createdTo} onApply={onDateRange} />
      </ColumnFunnel>
      <SortMenu sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
    </div>
  )
}
