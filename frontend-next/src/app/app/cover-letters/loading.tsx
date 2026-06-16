import { PageSkeleton } from '@/components/layout/app/page-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function CoverLettersLoading() {
  return (
    <PageSkeleton hasActions>
      <div className="space-y-4">
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
