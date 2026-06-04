import { Info } from 'lucide-react'

export function ReorderPausedHint() {
  return (
    <p className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Info className="size-3.5" aria-hidden="true" />
      Reordering is paused while filtered — clear filters to reorder.
    </p>
  )
}
