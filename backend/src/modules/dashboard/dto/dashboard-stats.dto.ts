import type { JobStatus } from '../../job/enums/job-status.enum.js';

export class DashboardStatsDto {
  totalJobs!: number;
  byStatus!: Record<JobStatus, number>;
  ghostAlerts!: number;
  recentActivity!: number;
}
