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
        // Hidden, not unmounted, while the palette is open: Radix still needs this
        // button to return focus to. The hide is a hard cut on purpose — an opacity
        // *transition* is invisible where it would matter (the card opens on top of
        // this button, covering it) and very visible where it hurts: once the card
        // flies off, a half-faded second magnifier sits here for ~150ms, against a
        // morph whose whole premise is that one icon travels.
        paletteOpen && 'pointer-events-none opacity-0',
        className,
      )}
    >
      <Search className="size-[18px]" aria-hidden="true" />
    </IconButton>
  )
}
