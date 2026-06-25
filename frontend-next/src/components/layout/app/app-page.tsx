import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * The shared content column for /app pages. Owns the page's vertical scroll and
 * generous padding — width is now controlled solely by the centered frame in
 * AppShell, so every page renders at the same centered width. Pages render a
 * `PageHeading` as the first child, then their content.
 */
export function AppPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className={cn('w-full px-6 py-10 sm:px-8 lg:px-10', className)}>{children}</div>
    </div>
  )
}
