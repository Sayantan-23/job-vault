'use client'

import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SearchInput } from './search-input'
import { SortControl } from './sort-control'
import { JOB_STATUSES, STATUS_META, type JobStatus } from '@/lib/job-status'
import { GHOST_OPTIONS, type GhostFilter, type JobFilters, type SortField } from '@/types/filters'

export function JobsToolbar({
  view,
  filters,
  isFiltered,
  onSearch,
  onStatus,
  onGhost,
  onSort,
  onReset,
}: {
  view: 'board' | 'list'
  filters: JobFilters
  isFiltered: boolean
  onSearch: (value: string) => void
  onStatus: (value: JobStatus | undefined) => void
  onGhost: (value: GhostFilter) => void
  onSort: (field: SortField) => void
  onReset: () => void
}) {
  const isList = view === 'list'
  // Reset is offered for any non-default state (narrowing filters OR a custom sort/page).
  const hasAny =
    isFiltered || filters.sortBy !== 'createdAt' || filters.sortOrder !== 'desc' || filters.page > 1

  // A Fragment (not a wrapping div) so each control is a direct flex item of the
  // page-header actions row — keeps them on one line with the toggle/add instead
  // of behaving as one nested block that wraps and floats.
  return (
    <>
      <SearchInput value={filters.search} onChange={onSearch} />

      {isList ? (
        <Select
          aria-label="Filter by status"
          value={filters.status ?? ''}
          onChange={(e) => onStatus(e.target.value ? (e.target.value as JobStatus) : undefined)}
          className="h-10 w-44"
        >
          <option value="">All statuses</option>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_META[s].label}</option>
          ))}
        </Select>
      ) : null}

      <Select
        aria-label="Filter by activity"
        value={filters.ghost}
        onChange={(e) => onGhost(e.target.value as GhostFilter)}
        className="h-10 w-40"
      >
        {GHOST_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>

      {isList ? <SortControl sortBy={filters.sortBy} sortOrder={filters.sortOrder} onSort={onSort} /> : null}

      {hasAny ? (
        <Button type="button" variant="ghost" size="sm" onClick={onReset}>
          Reset
        </Button>
      ) : null}
    </>
  )
}
