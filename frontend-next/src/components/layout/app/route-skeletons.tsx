import { PageSkeleton } from './page-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Per-route loading skeletons, shared by each route's loading.tsx (the RSC-fetch
 * fallback) AND its page's inner `<Suspense>` (the boundary useSearchParams()
 * needs). The latter previously used `fallback={null}` — which rendered the whole
 * content area, PageHeader included, blank during client navigation. These give
 * it a layout-stable skeleton instead.
 */

function SkeletonRows({ count, className }: { count: number; className: string }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </>
  )
}

export function DashboardSkeleton() {
  return (
    <PageSkeleton hasActions>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SkeletonRows count={4} className="h-24" />
      </div>
      <Skeleton className="mt-6 h-64" />
    </PageSkeleton>
  )
}

export function JobsSkeleton() {
  return (
    <PageSkeleton hasActions>
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="ml-auto h-9 w-28" />
      </div>
      <div className="space-y-2">
        <SkeletonRows count={8} className="h-12" />
      </div>
    </PageSkeleton>
  )
}

export function PersonasSkeleton() {
  return (
    <PageSkeleton hasActions>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SkeletonRows count={6} className="h-40" />
      </div>
    </PageSkeleton>
  )
}

export function ResumesSkeleton() {
  return (
    <PageSkeleton>
      <div className="space-y-6">
        <Skeleton className="h-28" />
        <div className="space-y-2">
          <SkeletonRows count={5} className="h-14" />
        </div>
      </div>
    </PageSkeleton>
  )
}

export function CoverLettersSkeleton() {
  return (
    <PageSkeleton hasActions>
      <div className="space-y-4">
        <Skeleton className="h-28" />
        <div className="space-y-2">
          <SkeletonRows count={5} className="h-14" />
        </div>
      </div>
    </PageSkeleton>
  )
}

export function CoverLetterEditorSkeleton() {
  return (
    <PageSkeleton hasActions hasDescription={false} back>
      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <Skeleton className="h-[70vh]" />
        <Skeleton className="h-64" />
      </div>
    </PageSkeleton>
  )
}

export function TimelineSkeleton() {
  return (
    <PageSkeleton hasDescription>
      <TimelineSkeletonBody />
    </PageSkeleton>
  )
}

// Mirrors the global timeline's grouped, full-width rail layout: a day-group
// heading (label + hairline rule) over rows of [rail node · title/description ·
// job · time]. Shared by the route skeleton and the feed's in-place loading
// state so both match the real UI.
export function TimelineSkeletonBody() {
  return (
    <div className="space-y-10" aria-hidden="true">
      {Array.from({ length: 2 }).map((_, g) => (
        <div key={g} className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-3 w-20" />
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="size-7 shrink-0 rounded-full" />
                <div className="grid flex-1 grid-cols-1 gap-x-8 gap-y-1.5 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_max-content] sm:items-baseline">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-3 w-16 sm:justify-self-end" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function SettingsSkeleton() {
  return (
    <PageSkeleton hasDescription>
      <div className="grid w-full max-w-5xl grid-cols-1 gap-5 lg:grid-cols-2">
        <SkeletonRows count={4} className="h-36 rounded-xl" />
      </div>
    </PageSkeleton>
  )
}

export function ProfileSkeleton() {
  return (
    <PageSkeleton hasActions>
      <div className="space-y-6">
        <SkeletonRows count={5} className="h-40" />
      </div>
    </PageSkeleton>
  )
}
