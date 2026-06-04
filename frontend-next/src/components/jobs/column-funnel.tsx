'use client'

import type { ReactNode } from 'react'
import { Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AnchoredPopover,
  AnchoredPopoverTrigger,
  AnchoredPopoverContent,
} from '@/components/ui/anchored-popover'

// A per-column filter trigger: a funnel that is hidden until the header is
// hovered (or the button is focused), with a dot when a filter is active. The
// menu body is passed as children and rendered in an anchored popover.
export function ColumnFunnel({
  label,
  active = false,
  children,
}: {
  label: string
  active?: boolean
  children: ReactNode
}) {
  return (
    <AnchoredPopover>
      <AnchoredPopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          data-active={active}
          className={cn(
            'relative inline-flex size-5 items-center justify-center rounded text-muted-foreground transition-opacity hover:text-foreground focus-visible:opacity-100 data-[state=open]:opacity-100',
            active ? 'text-foreground opacity-100' : 'opacity-0 group-hover/header:opacity-100',
          )}
        >
          <Filter className="size-3.5" aria-hidden="true" />
          {active ? (
            <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-primary" aria-hidden="true" />
          ) : null}
        </button>
      </AnchoredPopoverTrigger>
      <AnchoredPopoverContent>{children}</AnchoredPopoverContent>
    </AnchoredPopover>
  )
}
