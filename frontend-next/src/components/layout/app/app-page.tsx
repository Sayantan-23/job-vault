import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const WIDTHS = {
  default: 'max-w-3xl',
  wide: 'max-w-5xl',
  full: 'max-w-none',
} as const

/**
 * The shared content column for /app pages. Owns the page's vertical scroll and
 * an editorial, centered max-width column with generous padding — so content
 * opens directly on the canvas now that the global top bar is gone. Pages render
 * a `PageHeading` as the first child, then their content.
 */
export function AppPage({
  children,
  width = 'default',
  className,
}: {
  children: ReactNode
  width?: keyof typeof WIDTHS
  className?: string
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className={cn('mx-auto w-full px-6 py-10 sm:px-8 lg:px-12', WIDTHS[width], className)}>
        {children}
      </div>
    </div>
  )
}
