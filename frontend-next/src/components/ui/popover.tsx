'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

export const Popover = DialogPrimitive.Root
export const PopoverTrigger = DialogPrimitive.Trigger
export const PopoverClose = DialogPrimitive.Close
export const PopoverTitle = DialogPrimitive.Title

function PopoverOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      // Radix portals to <body>, outside [data-theme-scope="app"]; re-apply the
      // scope so the theme tokens resolve inside the popover.
      data-theme-scope="app"
      className={cn('fixed inset-0 z-40', className)}
      {...props}
    />
  )
}

// A lightweight popover built on the dialog primitive: anchored top-right (under
// the header bell) rather than centered. Behavior (focus trap, escape, outside
// click) comes from Radix; presentation is ours.
export function PopoverContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <PopoverOverlay />
      <DialogPrimitive.Content
        data-theme-scope="app"
        className={cn(
          'fixed right-4 top-16 z-50 flex max-h-[70vh] w-80 flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-lg focus:outline-none',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
