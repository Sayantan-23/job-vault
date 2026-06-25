import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * The shared content column for /app pages: caps content at the standard width
 * and supplies the editorial padding. The vertical scroll lives on `main`
 * (AppShell) — which runs to the viewport's right edge — so the scrollbar stays
 * at the window's right side. Pages render a `PageHeading` as the first child.
 */
export function AppPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('w-full max-w-[1000px] px-6 py-10 sm:px-8 lg:px-10', className)}>{children}</div>
  )
}
