'use client'

import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SearchInput } from './search-input'
import { GHOST_OPTIONS, type GhostFilter, type JobFilters } from '@/types/filters'

export function JobsToolbar({
  filters,
  showReset,
  onSearch,
  onGhost,
  onReset,
}: {
  filters: JobFilters
  showReset: boolean
  onSearch: (value: string) => void
  onGhost: (value: GhostFilter) => void
  onReset: () => void
}) {
  // A Fragment so each control is a direct flex item of the page-header actions row.
  return (
    <>
      <SearchInput value={filters.search} onChange={onSearch} />
      <Select
        aria-label="Filter by activity"
        value={filters.ghost}
        onChange={(e) => onGhost(e.target.value as GhostFilter)}
        className="h-10 w-40 shrink-0"
      >
        {GHOST_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
      {showReset ? (
        <Button type="button" variant="ghost" size="sm" onClick={onReset} className="shrink-0">
          Clear all
        </Button>
      ) : null}
    </>
  )
}
