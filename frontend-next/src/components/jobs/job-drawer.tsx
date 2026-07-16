'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useJob } from '@/hooks/use-jobs'
import { JobDetails } from './job-details'
import { JobSnapshot } from './job-snapshot'
import { TimelineSection } from './timeline/timeline-section'
import { RemindersSection } from './reminders/reminders-section'
import { OutreachSection } from './outreach/outreach-section'
import { ResumeLauncher } from './resume/resume-launcher'
import { CoverLetterLauncher } from './cover-letter/cover-letter-launcher'

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
      <SheetContent hideClose>
        <SheetTitle className="sr-only">Job details</SheetTitle>
        <div className="space-y-6 p-6">
          {isLoading || !job ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <JobDetails job={job} onDeleted={close} onClose={close} />
              <div className="border-t border-border pt-5">
                <JobSnapshot markdown={job.snapshotMarkdown} sourceUrl={job.sourceUrl} />
              </div>
              <div className="border-t border-border pt-5">
                <TimelineSection jobId={job.id} />
              </div>
              <div className="border-t border-border pt-5">
                <RemindersSection jobId={job.id} />
              </div>
              <div className="border-t border-border pt-5">
                <OutreachSection jobId={job.id} />
              </div>
              <div className="border-t border-border pt-5">
                <ResumeLauncher jobId={job.id} />
              </div>
              <div className="border-t border-border pt-5">
                <CoverLetterLauncher jobId={job.id} />
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
