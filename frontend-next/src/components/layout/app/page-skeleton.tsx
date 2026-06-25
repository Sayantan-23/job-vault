import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { RouteProgress } from '@/components/ui/route-progress'
import { cn } from '@/lib/utils'

/**
 * The shared scaffold for every app route's loading.tsx. It mirrors `AppPage`'s
 * editorial layout — a centered, borderless max-width column with generous
 * padding, opening on a serif-title-sized `PageHeading` skeleton over an optional
 * description line and the page-specific body — so a route transition shows a
 * layout-stable skeleton instead of a chrome flash + layout shift (the sidebar
 * lives in the layout and persists; only this scroll subtree swaps). `children`
 * is the page-specific body skeleton.
 *
 * `back` reserves the detail-page back-arrow slot above the title so the heading
 * doesn't shift when the real page lands. `width` matches the page's own column
 * width (default `max-w-3xl`; Jobs uses `max-w-4xl`).
 */
export function PageSkeleton({
  hasActions = false,
  hasDescription = true,
  back = false,
  width = 'max-w-3xl',
  children,
}: {
  hasActions?: boolean
  hasDescription?: boolean
  back?: boolean
  width?: 'max-w-3xl' | 'max-w-4xl'
  children: ReactNode
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <RouteProgress />
      <div className={cn('mx-auto w-full px-6 py-10 sm:px-8 lg:px-12', width)}>
        <div className="mb-8 space-y-3">
          {back ? <Skeleton className="size-7 rounded-md" /> : null}
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <div className="space-y-2">
              <Skeleton className="h-10 w-48" />
              {hasDescription ? <Skeleton className="h-4 w-64" /> : null}
            </div>
            {hasActions ? <Skeleton className="h-9 w-32 rounded-md" /> : null}
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
