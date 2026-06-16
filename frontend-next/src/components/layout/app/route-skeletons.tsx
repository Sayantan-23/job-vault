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

export function ProfileSkeleton() {
  return (
    <PageSkeleton hasActions>
      <div className="space-y-6">
        <SkeletonRows count={5} className="h-40" />
      </div>
    </PageSkeleton>
  )
}
