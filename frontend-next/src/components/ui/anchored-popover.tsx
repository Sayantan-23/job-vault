'use client'

import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/utils'

export const AnchoredPopover = PopoverPrimitive.Root
export const AnchoredPopoverTrigger = PopoverPrimitive.Trigger
export const AnchoredPopoverClose = PopoverPrimitive.Close

// A popover anchored to its trigger (unlike ui/popover.tsx, which is pinned
// top-right for the notification bell). Behavior from Radix; presentation ours.
export function AnchoredPopoverContent({
  className,
  align = 'start',
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-theme-scope="app"
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        className={cn(
          'z-50 w-60 rounded-xl border border-border bg-card p-1 text-card-foreground shadow-lg focus:outline-none',
          'origin-[var(--radix-popover-content-transform-origin)] data-[state=open]:animate-jv-surface-in data-[state=closed]:animate-jv-surface-out',
          className,
        )}
        {...props}
      >
        {children}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}
