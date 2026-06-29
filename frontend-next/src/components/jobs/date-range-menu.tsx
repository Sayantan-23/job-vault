'use client'

import { Input } from '@/components/ui/input'

// A controlled From/To date-range picker. It holds no state and commits nothing
// on its own — the parent owns the draft values and decides when to apply them
// (behind the shared Apply button in JobsFilterMenu), so the date range behaves
// consistently with the status filter rather than self-applying.
export function DateRangeMenu({
  from,
  to,
  onChange,
}: {
  from?: string | undefined
  to?: string | undefined
  onChange: (from?: string, to?: string) => void
}) {
  return (
    <div className="flex flex-col gap-2 p-1.5">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        From
        <Input
          type="date"
          value={from ?? ''}
          max={to || undefined}
          onChange={(e) => onChange(e.target.value || undefined, to)}
          className="h-9"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        To
        <Input
          type="date"
          value={to ?? ''}
          min={from || undefined}
          onChange={(e) => onChange(from, e.target.value || undefined)}
          className="h-9"
        />
      </label>
    </div>
  )
}
