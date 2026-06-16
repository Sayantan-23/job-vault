export interface TimelineEvent {
  id: string
  jobId: string
  userId: string
  type: 'AUTO' | 'MANUAL'
  title: string
  description: string | null
  createdAt: string
}

// A timeline event in the global feed (GET /api/timeline), enriched with its
// job's title + company so a cross-job row is legible without a separate lookup.
export interface GlobalTimelineEvent extends TimelineEvent {
  jobTitle: string
  jobCompany: string
}
