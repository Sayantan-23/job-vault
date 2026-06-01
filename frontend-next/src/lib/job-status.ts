export const JOB_STATUSES = [
  'WISHLIST',
  'APPLIED',
  'INTERVIEWING',
  'OFFER',
  'REJECTED',
  'ARCHIVED',
] as const

export type JobStatus = (typeof JOB_STATUSES)[number]

interface StatusMeta {
  label: string
  /** Tailwind classes for the chip surface. */
  className: string
}

export const STATUS_META: Record<JobStatus, StatusMeta> = {
  WISHLIST: { label: 'Wishlist', className: 'bg-muted text-muted-foreground' },
  APPLIED: { label: 'Applied', className: 'bg-primary/10 text-primary' },
  INTERVIEWING: { label: 'Interviewing', className: 'bg-ghost-active/15 text-ghost-active' },
  OFFER: { label: 'Offer', className: 'bg-ghost-active/20 text-ghost-active' },
  REJECTED: { label: 'Rejected', className: 'bg-ghost-ghosted/15 text-ghost-ghosted' },
  ARCHIVED: { label: 'Archived', className: 'bg-muted text-muted-foreground' },
}
