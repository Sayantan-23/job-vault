'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function DateRangeMenu({
  from,
  to,
  onApply,
}: {
  from?: string | undefined
  to?: string | undefined
  onApply: (from?: string, to?: string) => void
}) {
  const [localFrom, setLocalFrom] = useState(from ?? '')
  const [localTo, setLocalTo] = useState(to ?? '')

  return (
    <div className="flex flex-col gap-2 p-1.5">
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        From
        <Input
          type="date"
          value={localFrom}
          max={localTo || undefined}
          onChange={(e) => setLocalFrom(e.target.value)}
          className="h-9"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
        To
        <Input
          type="date"
          value={localTo}
          min={localFrom || undefined}
          onChange={(e) => setLocalTo(e.target.value)}
          className="h-9"
        />
      </label>
      <div className="mt-1 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { setLocalFrom(''); setLocalTo(''); onApply(undefined, undefined) }}
        >
          Clear
        </Button>
        <Button type="button" size="sm" onClick={() => onApply(localFrom || undefined, localTo || undefined)}>
          Apply
        </Button>
      </div>
    </div>
  )
}
