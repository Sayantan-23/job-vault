'use client'

import type { Ref } from 'react'
import { Search } from 'lucide-react'
import { IconButton } from '@/components/ui/icon-button'
import { cn } from '@/lib/utils'

/**
 * The global-search trigger — deliberately the same geometry as the notification
 * bell it sits beside (the shared IconButton), so the two read as one cluster.
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
    <IconButton
      ref={ref}
      title="Search"
      aria-label="Search"
      onClick={onOpen}
      className={cn(
        // The transition has to cover opacity, not just colours: the card's own
        // header fades in on a 140ms delay, so a hard-cut trigger leaves an empty
        // capsule for the first half of the morph instead of cross-fading with it.
        'transition-[color,background-color,opacity] duration-200 motion-reduce:transition-none',
        // Faded rather than unmounted while the palette is open: the card carries
        // its own close control at the same corner, so the icon reads as one
        // element travelling — and Radix still has this button to return focus to.
        paletteOpen && 'pointer-events-none opacity-0',
        className,
      )}
    >
      <Search className="size-[18px]" aria-hidden="true" />
    </IconButton>
  )
}
