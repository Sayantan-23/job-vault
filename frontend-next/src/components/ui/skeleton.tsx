import { cn } from '@/lib/utils'

/**
 * A layout-stable placeholder block with a faint shimmer sweep. Used by the
 * per-route loading.tsx skeletons so navigation shows the page's shape instead
 * of a blank flash. Purely decorative — hidden from assistive tech, and the
 * sweep is suppressed under prefers-reduced-motion (the muted block remains).
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('relative overflow-hidden rounded-md bg-muted/70', className)}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent animate-jv-shimmer motion-reduce:hidden" />
    </div>
  )
}
