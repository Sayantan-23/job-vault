import { PageSkeleton } from '@/components/layout/app/page-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function CoverLetterEditorLoading() {
  return (
    <PageSkeleton hasActions hasDescription={false} back>
      <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <Skeleton className="h-[70vh]" />
        <Skeleton className="h-64" />
      </div>
    </PageSkeleton>
  )
}
