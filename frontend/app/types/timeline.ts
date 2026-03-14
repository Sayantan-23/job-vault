export type TimelineEventType = 'AUTO' | 'MANUAL';

export interface TimelineEvent {
  id: string;
  jobId: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  createdAt: string;
}

export interface CreateTimelineEventRequest {
  title: string;
  description?: string;
}
