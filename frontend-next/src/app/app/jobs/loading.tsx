import { PageSkeleton } from '@/components/layout/app/page-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function JobsLoading() {
  return (
    <PageSkeleton hasActions>
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="ml-auto h-9 w-28" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    </PageSkeleton>
  )
}
