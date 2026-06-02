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

// Pipeline-status colors are deliberately drawn from the neutral + brand-indigo
// ramp (plus the dedicated `destructive` token for a negative outcome). The
// green/amber/rose GhostMeter palette is reserved exclusively for application
// *health* — so a chip's color never collides with a card's ghost signal.
// (Final board treatment is revisited in Slice 3 when the Kanban is built.)
export const STATUS_META: Record<JobStatus, StatusMeta> = {
  WISHLIST: { label: 'Wishlist', className: 'bg-muted text-muted-foreground' },
  APPLIED: { label: 'Applied', className: 'bg-secondary text-secondary-foreground' },
  INTERVIEWING: { label: 'Interviewing', className: 'bg-primary/10 text-primary' },
  OFFER: { label: 'Offer', className: 'bg-primary text-primary-foreground' },
  REJECTED: { label: 'Rejected', className: 'bg-destructive/10 text-destructive' },
  ARCHIVED: { label: 'Archived', className: 'bg-muted text-muted-foreground opacity-70' },
}
