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
      {/* below sm the select is flexible (basis-0 + grow) so it always shares one
          line with the toggle/add button, however narrow; from sm up it holds w-40 */}
      <div className="min-w-0 grow basis-0 sm:grow-0 sm:basis-auto sm:shrink-0">
        <Select
          aria-label="Filter by activity"
          value={filters.ghost}
          onChange={(e) => onGhost(e.target.value as GhostFilter)}
          className="h-10 w-full sm:w-40"
        >
          {GHOST_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      </div>
      {showReset ? (
        <Button type="button" variant="ghost" size="sm" onClick={onReset} className="shrink-0">
          Clear all
        </Button>
      ) : null}
    </>
  )
}
