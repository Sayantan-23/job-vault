'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { StatusChip } from '@/components/kanban/status-chip'
import { GhostMeter } from '@/components/kanban/ghost-meter'
import { OutreachBadge } from './outreach-badge'
import { shortDate } from '@/lib/relative-time'
import { ghostLevel } from '@/lib/ghost'
import type { Job } from '@/types/job'

// A grouped, borderless, Linear-style list (not a boxed table). The incoming
// `jobs` are already server-sorted/filtered; we only partition them client-side
// into "Needs your attention" (live-pipeline jobs that have gone stale/ghosted,
// surfaced first) and the rest ("In progress"). Both groups PRESERVE the server
// order so the SortMenu stays truthful — we never re-sort here.
type Group = { label: string | null; jobs: Job[] }

// Only jobs still in the active pipeline (applied / interviewing) can "need
// attention" — a stale REJECTED/ARCHIVED/WISHLIST/OFFER job isn't actionable.
function needsAttention(job: Job): boolean {
  return (
    ghostLevel(job.ghostDays) !== 'active' &&
    (job.status === 'APPLIED' || job.status === 'INTERVIEWING')
  )
}

function groupJobs(jobs: Job[]): Group[] {
  const needs = jobs.filter(needsAttention)
  const inProgress = jobs.filter((j) => !needsAttention(j))

  const groups: Group[] = []
  if (needs.length) groups.push({ label: 'Needs your attention', jobs: needs })
  if (inProgress.length) {
    // No label when this is the only group — there's nothing to contrast against.
    groups.push({ label: needs.length ? 'In progress' : null, jobs: inProgress })
  }
  return groups
}

// Slugify a group label into a stable id so the <section> can point its
// aria-labelledby at the <h2> (the page h1 is "Jobs", so h2 is correct here).
function groupHeadingId(label: string): string {
  return `job-group-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}

function GroupHeader({ label, count }: { label: string; count: number }) {
  return (
    <h2
      id={groupHeadingId(label)}
      className="mb-2 flex items-center gap-2 px-1 text-sm font-medium text-muted-foreground"
    >
      {label}
      <span className="font-mono text-[11px] tabular-nums opacity-80">{count}</span>
    </h2>
  )
}

function JobRow({ job, href }: { job: Job; href: string }) {
  return (
    <li>
      <Link
        href={href}
        scroll={false}
        className="grid grid-cols-[1fr_auto] items-center gap-5 rounded-md px-1 py-3 transition-colors hover:bg-accent/50"
      >
        <span className="min-w-0">
          <span className="block truncate text-[14.5px] font-medium">{job.title}</span>
          <span className="block truncate text-[13px] text-muted-foreground">
            {job.company}
            {job.location ? ` · ${job.location}` : ''}
          </span>
        </span>
        <span className="flex items-center justify-end gap-4">
          <OutreachBadge variant="list" count={job.outreachCount ?? 0} replies={job.outreachReplies ?? 0} />
          <StatusChip status={job.status} />
          <GhostMeter days={job.ghostDays} />
          <span className="min-w-[46px] text-right font-mono text-xs tabular-nums text-muted-foreground">
            {shortDate(job.createdAt)}
          </span>
        </span>
      </Link>
    </li>
  )
}

function ListSkeleton() {
  return (
    <ul className="divide-y divide-hairline">
      {Array.from({ length: 6 }).map((_, i) => (
        <li key={i} className="h-12 animate-pulse" />
      ))}
    </ul>
  )
}

function EmptyState({ filtered, onReset }: { filtered: boolean; onReset: () => void }) {
  return (
    <div className="py-16 text-center">
      {filtered ? (
        <>
          <p className="font-serif text-xl">No jobs match your filters</p>
          <p className="mt-2 text-sm text-muted-foreground">Try widening or clearing them.</p>
          <Button type="button" variant="outline" size="sm" onClick={onReset} className="mt-5">
            Reset filters
          </Button>
        </>
      ) : (
        <>
          <p className="font-serif text-xl">No jobs yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your first application to start tracking it.
          </p>
        </>
      )}
    </div>
  )
}

export function JobList({
  jobs,
  loading,
  isFiltered,
  onReset,
}: {
  jobs: Job[]
  loading: boolean
  isFiltered: boolean
  onReset: () => void
}) {
  const sp = useSearchParams()
  const hrefFor = (id: string) => {
    const params = new URLSearchParams(sp.toString())
    params.set('job', id)
    return `/app/jobs?${params.toString()}`
  }

  if (loading && jobs.length === 0) return <ListSkeleton />
  if (jobs.length === 0) return <EmptyState filtered={isFiltered} onReset={onReset} />

  const groups = groupJobs(jobs)

  return (
    <div className="space-y-8">
      {groups.map((group, i) => (
        <section
          key={group.label ?? `group-${i}`}
          aria-labelledby={group.label ? groupHeadingId(group.label) : undefined}
        >
          {group.label ? <GroupHeader label={group.label} count={group.jobs.length} /> : null}
          <ul className="divide-y divide-hairline">
            {group.jobs.map((job) => (
              <JobRow key={job.id} job={job} href={hrefFor(job.id)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
