'use client'

import type { Ref } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The global-search trigger — deliberately the same geometry as the notification
 * bell it sits beside (`size-9 rounded-full`), so the two read as one cluster.
 * The same component is mounted in the desktop cluster and in the mobile header;
 * the palette reads whichever one was clicked for the morph's origin.
 */
export function SearchTrigger({
  ref,
  paletteOpen,
  onOpen,
  className,
}: {
  ref?: Ref<HTMLButtonElement>
  paletteOpen: boolean
  onOpen: () => void
  className?: string | undefined
}) {
  return (
    <button
      ref={ref}
      type="button"
      title="Search"
      aria-label="Search"
      onClick={onOpen}
      className={cn(
        'grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        // Faded rather than unmounted while the palette is open: the card carries
        // its own close control at the same corner, so the icon reads as one
        // element travelling — and Radix still has this button to return focus to.
        paletteOpen && 'pointer-events-none opacity-0',
        className,
      )}
    >
      <Search className="size-[18px]" aria-hidden="true" />
    </button>
  )
}
