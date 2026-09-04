export interface TimelineEvent {
  id: string
  jobId: string
  userId: string
  type: 'AUTO' | 'MANUAL'
  title: string
  description: string | null
  createdAt: string
}
