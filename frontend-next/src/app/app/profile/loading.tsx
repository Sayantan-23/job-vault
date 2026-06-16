import { PageSkeleton } from '@/components/layout/app/page-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function ProfileLoading() {
  return (
    <PageSkeleton hasActions>
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </PageSkeleton>
  )
}
