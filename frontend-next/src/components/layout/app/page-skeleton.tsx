import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { RouteProgress } from '@/components/ui/route-progress'

/**
 * The shared scaffold for every app route's loading.tsx. It mirrors the page
 * chrome — a PageHeader-shaped bar (h-16, hairline border) over the scrollable
 * p-6 body — so a route transition shows a layout-stable skeleton instead of a
 * blank flash (the sidebar lives in the layout and persists; only this <main>
 * subtree swaps). `children` is the page-specific body skeleton.
 *
 * `back` reserves the detail-page back-arrow slot so the header doesn't shift
 * when the real page lands.
 */
export function PageSkeleton({
  hasActions = false,
  hasDescription = true,
  back = false,
  children,
}: {
  hasActions?: boolean
  hasDescription?: boolean
  back?: boolean
  children: ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <RouteProgress />
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-6">
        <div className="flex min-w-0 items-center gap-2">
          {back ? <Skeleton className="size-8 rounded-md" /> : null}
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            {hasDescription ? <Skeleton className="h-3 w-52" /> : null}
          </div>
        </div>
        {hasActions ? <Skeleton className="h-9 w-32 rounded-md" /> : null}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  )
}
