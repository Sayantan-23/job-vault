'use client'

import { useState, type ReactNode } from 'react'
import { Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AnchoredPopover,
  AnchoredPopoverTrigger,
  AnchoredPopoverContent,
} from '@/components/ui/anchored-popover'
import { StatusFilterMenu } from './status-filter-menu'
import { DateRangeMenu } from './date-range-menu'
import type { JobStatus } from '@/lib/job-status'

function FilterSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="p-1">
      <p className="px-2.5 pb-1 pt-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
        {label}
      </p>
      {children}
    </div>
  )
}

// A single "Filter" control that merges the status and date-added filters that
// previously sat as two bare, indistinguishable funnel icons. The popover is a
// staging form: picking a status or editing the date range only updates a local
// draft — nothing filters until "Apply" (which commits both facets in one URL
// update and closes), so status and date behave consistently. "Clear" removes
// all filters and closes. The trigger carries a count of the currently-applied
// facets. The draft re-syncs from the applied filters each time it opens, so a
// popover dismissed without applying discards its edits.
export function JobsFilterMenu({
  status,
  createdFrom,
  createdTo,
  onApply,
}: {
  status: JobStatus | undefined
  createdFrom?: string | undefined
  createdTo?: string | undefined
  onApply: (next: { status?: JobStatus | undefined; from?: string | undefined; to?: string | undefined }) => void
}) {
  const [open, setOpen] = useState(false)
  const [draftStatus, setDraftStatus] = useState<JobStatus | undefined>(status)
  const [draftFrom, setDraftFrom] = useState<string | undefined>(createdFrom)
  const [draftTo, setDraftTo] = useState<string | undefined>(createdTo)

  const statusActive = status !== undefined
  const dateActive = createdFrom !== undefined || createdTo !== undefined
  const activeCount = (statusActive ? 1 : 0) + (dateActive ? 1 : 0)
  const draftEmpty = draftStatus === undefined && !draftFrom && !draftTo

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraftStatus(status)
      setDraftFrom(createdFrom)
      setDraftTo(createdTo)
    }
    setOpen(next)
  }

  function apply() {
    onApply({ status: draftStatus, from: draftFrom, to: draftTo })
    setOpen(false)
  }

  function clear() {
    setDraftStatus(undefined)
    setDraftFrom(undefined)
    setDraftTo(undefined)
    onApply({})
    setOpen(false)
  }

  return (
    <AnchoredPopover open={open} onOpenChange={handleOpenChange}>
      <AnchoredPopoverTrigger asChild>
        <button
          type="button"
          aria-label="Filter jobs"
          data-active={activeCount > 0}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[state=open]:text-foreground data-[active=true]:text-foreground"
        >
          <Filter className="size-3.5" aria-hidden="true" />
          Filter
          {activeCount > 0 ? (
            <span className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-mono text-[0.625rem] font-medium leading-none text-primary-foreground tabular-nums">
              {activeCount}
            </span>
          ) : null}
        </button>
      </AnchoredPopoverTrigger>
      <AnchoredPopoverContent align="end" className="w-64 p-0">
        <div className="flex flex-col">
          <FilterSection label="Status">
            <StatusFilterMenu value={draftStatus} onChange={setDraftStatus} />
          </FilterSection>
          <div className="mx-1 h-px bg-border" aria-hidden="true" />
          <FilterSection label="Date added">
            <DateRangeMenu
              from={draftFrom}
              to={draftTo}
              onChange={(f, t) => {
                setDraftFrom(f)
                setDraftTo(t)
              }}
            />
          </FilterSection>
          <div className="mx-1 h-px bg-border" aria-hidden="true" />
          <div className="flex items-center justify-between gap-2 p-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clear}
              disabled={draftEmpty && activeCount === 0}
            >
              Clear
            </Button>
            <Button type="button" size="sm" onClick={apply}>
              Apply
            </Button>
          </div>
        </div>
      </AnchoredPopoverContent>
    </AnchoredPopover>
  )
}
