'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useJob } from '@/hooks/use-jobs'
import { JobDetails } from './job-details'
import { JobSnapshot } from './job-snapshot'
import { TimelineSection } from './timeline/timeline-section'
import { RemindersSection } from './reminders/reminders-section'

export function JobDrawer({ jobId }: { jobId: string | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { data: job, isLoading } = useJob(jobId)
  const open = jobId !== null

  const close = () => {
    const params = new URLSearchParams(searchParams)
    params.delete('job')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

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
              <div className="border-t border-border pt-5">
                <TimelineSection jobId={job.id} />
              </div>
              <div className="border-t border-border pt-5">
                <RemindersSection jobId={job.id} />
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
