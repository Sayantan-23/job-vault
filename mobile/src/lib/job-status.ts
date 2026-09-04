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
  /** NativeWind classes for the chip surface. */
  className: string
}

// Pipeline-status colors are deliberately drawn from the neutral + brand-indigo
// ramp (plus the dedicated `destructive` token for a negative outcome). The
// green/amber/rose GhostMeter palette is reserved exclusively for application
// *health* — so a chip's color never collides with a card's ghost signal.
//
// Ported verbatim from frontend-next/src/lib/job-status.ts: the `/10` opacity
// modifiers and `opacity-70` both render under NativeWind 5 (confirmed in the
// existing mobile primitives — button.tsx `bg-primary/10`, icon-button.tsx
// `active:opacity-70`), so no token swap was needed.
export const STATUS_META: Record<JobStatus, StatusMeta> = {
  WISHLIST: { label: 'Wishlist', className: 'bg-muted text-muted-foreground' },
  APPLIED: { label: 'Applied', className: 'bg-secondary text-secondary-foreground' },
  INTERVIEWING: { label: 'Interviewing', className: 'bg-primary/10 text-primary' },
  OFFER: { label: 'Offer', className: 'bg-primary text-primary-foreground' },
  REJECTED: { label: 'Rejected', className: 'bg-destructive/10 text-destructive' },
  ARCHIVED: { label: 'Archived', className: 'bg-muted text-muted-foreground opacity-70' },
}
