import { PageSkeleton } from '@/components/layout/app/page-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function ResumesLoading() {
  return (
    <PageSkeleton>
      <div className="space-y-6">
        <Skeleton className="h-28" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      </div>
    </PageSkeleton>
  )
}
