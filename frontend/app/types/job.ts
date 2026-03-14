import type { JobStatus } from '~/utils/constants';

export interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  salaryRange?: string;
  sourceUrl?: string;
  snapshotMarkdown?: string;
  status: JobStatus;
  kanbanOrder: number;
  lastActivityAt?: string;
  ghostDays: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobFromUrlRequest {
  sourceUrl: string;
}

export interface CreateJobManualRequest {
  title: string;
  company: string;
  location?: string;
  salaryRange?: string;
  sourceUrl?: string;
  snapshotMarkdown?: string;
  status?: JobStatus;
  notes?: string;
}

export interface UpdateJobRequest {
  title?: string;
  company?: string;
  location?: string;
  salaryRange?: string;
  notes?: string;
  status?: JobStatus;
}

export interface MoveJobRequest {
  status: JobStatus;
  kanbanOrder: number;
}

export interface ScrapeResult {
  title: string;
  company: string;
  location?: string;
  salaryRange?: string;
  snapshotMarkdown: string;
}

export interface JobCard {
  id: string;
  title: string;
  company: string;
  location?: string;
  ghostDays: number;
  status: JobStatus;
  kanbanOrder: number;
  lastActivityAt?: string;
  createdAt: string;
}

export interface KanbanColumn {
  status: JobStatus;
  label: string;
  color: string;
  jobs: JobCard[];
}

export interface KanbanBoardData {
  columns: KanbanColumn[];
  stats: DashboardStats;
}

export interface DashboardStats {
  totalJobs: number;
  byStatus: Record<JobStatus, number>;
  ghostAlerts: number;
  recentActivity: number;
}

export interface MoveJobPayload {
  jobId: string;
  newStatus: JobStatus;
  newOrder: number;
}
