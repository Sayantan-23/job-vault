import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * A quiet 36px circular icon control — the shape of the floating utility cluster
 * at the top-right of the app canvas (search, notifications). Not a Button
 * variant: Button is a labelled action with its own height scale, this is a bare
 * glyph that only ever holds an icon.
 *
 * Forwards its ref so it can be the child of a Radix `asChild` trigger.
 */
export const IconButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
  <button
    ref={ref}
    type="button"
    className={cn(
      'grid size-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
      className,
    )}
    {...props}
  />
))
IconButton.displayName = 'IconButton'
