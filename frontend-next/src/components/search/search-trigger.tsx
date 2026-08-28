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
        // button to return focus to. Both edges are hard cuts — a *fading* second
        // magnifier next to a morph whose whole premise is that one icon travels is
        // exactly the artefact to avoid. Opening cuts it out instantly (the card is
        // on top of this button anyway). Closing delays the cut back in by 200ms of
        // the card's 220ms return, so the trigger reappears underneath the card in
        // its last frames: never a gap with neither painted, never two magnifiers
        // side by side. A zero-duration transition is the delay — `color` and
        // `background-color` are re-listed because setting transition-property
        // would otherwise drop IconButton's own hover fade.
        paletteOpen
          ? 'pointer-events-none opacity-0 transition-none'
          : [
              'transition-[opacity,color,background-color]',
              'duration-[0ms,150ms,150ms] delay-[200ms,0ms,0ms]',
              'motion-reduce:transition-none',
            ],
        className,
      )}
    >
      <Search className="size-[18px]" aria-hidden="true" />
    </IconButton>
  )
}
