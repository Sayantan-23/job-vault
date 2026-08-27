'use client'

import * as React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close
export const SheetTitle = DialogPrimitive.Title
export const SheetDescription = DialogPrimitive.Description

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      // Radix portals to <body>, outside [data-theme-scope="app"]; re-apply the
      // scope so the theme tokens (--card/--border/…) resolve inside the drawer.
      data-theme-scope="app"
      className={cn(
        'fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px]',
        'data-[state=open]:animate-jv-overlay-in data-[state=closed]:animate-jv-overlay-out',
        className,
      )}
      {...props}
    />
  )
}

export function SheetContent({
  className,
  children,
  hideClose = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { hideClose?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <SheetOverlay />
      <DialogPrimitive.Content
        data-theme-scope="app"
        // Radix autofocuses the first tabbable node with `select: true`, which
        // selects the whole value when that node is a text input. Focus the
        // panel itself instead: the dialog is still announced and Tab lands on
        // the first field, with nothing pre-selected.
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          ;(e.currentTarget as HTMLElement | null)?.focus()
        }}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col overflow-y-auto border-l border-border bg-card text-card-foreground shadow-lg focus:outline-none',
          'sm:max-w-2xl',
          'data-[state=open]:animate-jv-sheet-in data-[state=closed]:animate-jv-sheet-out',
          className,
        )}
        {...props}
      >
        {children}
        {hideClose ? null : (
          <DialogPrimitive.Close
            className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close"
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
