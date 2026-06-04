'use client'

import { ArrowDown, ArrowUp } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { SORT_OPTIONS, type SortField, type SortOrder } from '@/types/filters'

export function SortControl({
  sortBy,
  sortOrder,
  onSort,
}: {
  sortBy: SortField
  sortOrder: SortOrder
  onSort: (field: SortField) => void
}) {
  const DirIcon = sortOrder === 'asc' ? ArrowUp : ArrowDown
  return (
    <div className="flex items-center gap-1.5">
      <Select
        aria-label="Sort by"
        value={sortBy}
        onChange={(e) => onSort(e.target.value as SortField)}
        className="h-10 w-40"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </Select>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Toggle sort direction"
        onClick={() => onSort(sortBy)}
      >
        <DirIcon className="size-4" aria-hidden="true" />
      </Button>
    </div>
  )
}
