'use client'

import { useRouter } from 'next/navigation'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useJob } from '@/hooks/use-jobs'
import { JobDetails } from './job-details'
import { JobSnapshot } from './job-snapshot'

export function JobDrawer({ jobId }: { jobId: string | null }) {
  const router = useRouter()
  const { data: job, isLoading } = useJob(jobId)
  const open = jobId !== null

  const close = () => router.push('/app/jobs')

  return (
    <Sheet open={open} onOpenChange={(o) => (o ? undefined : close())}>
      <SheetContent>
        <SheetTitle className="sr-only">Job details</SheetTitle>
        <div className="space-y-6 p-6">
          {isLoading || !job ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <JobDetails job={job} onDeleted={close} />
              <div className="border-t border-border pt-5">
                <JobSnapshot markdown={job.snapshotMarkdown} sourceUrl={job.sourceUrl} />
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
