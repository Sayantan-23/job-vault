import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Job } from '../job/entities/job.entity.js';
import { JobStatus } from '../job/enums/job-status.enum.js';
import type { DashboardQueryDto } from './dto/dashboard-query.dto.js';
import type { DashboardStatsDto } from './dto/dashboard-stats.dto.js';
import type {
  KanbanBoardResponseDto,
  KanbanCardDto,
  KanbanColumnDto,
} from './dto/kanban-response.dto.js';

const COLUMN_CONFIG: Record<string, { label: string; color: string }> = {
  WISHLIST: { label: 'Wishlist', color: 'neutral' },
  APPLIED: { label: 'Applied', color: 'info' },
  INTERVIEWING: { label: 'Interviewing', color: 'warning' },
  OFFER: { label: 'Offer', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'error' },
  ARCHIVED: { label: 'Archived', color: 'neutral' },
};

/** Ordered list of statuses for column rendering */
const COLUMN_ORDER: JobStatus[] = [
  JobStatus.WISHLIST,
  JobStatus.APPLIED,
  JobStatus.INTERVIEWING,
  JobStatus.OFFER,
  JobStatus.REJECTED,
  JobStatus.ARCHIVED,
];

@Injectable()
export class DashboardService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Build the full Kanban board: 6 columns with jobs, plus aggregated stats.
   * Fetches ALL user jobs (no pagination) so the frontend can render drag-and-drop.
   */
  async getKanbanBoard(
    userId: string,
    query: DashboardQueryDto,
  ): Promise<KanbanBoardResponseDto> {
    // 1. Build query for all user's jobs
    const qb = this.em
      .createQueryBuilder(Job, 'j')
      .where({ user: userId });

    // 2. Apply search filter (ILIKE on title, company)
    if (query.search) {
      const searchPattern = `%${query.search}%`;
      qb.andWhere({
        $or: [
          { title: { $ilike: searchPattern } },
          { company: { $ilike: searchPattern } },
        ],
      });
    }

    // 3. Apply status filter
    if (query.status) {
      qb.andWhere({ status: query.status });
    }

    // 4. Apply ghost filter
    if (query.ghostFilter && query.ghostFilter !== 'all') {
      switch (query.ghostFilter) {
        case 'active':
          qb.andWhere({ ghostDays: { $lte: 7 } });
          break;
        case 'stale':
          qb.andWhere({ ghostDays: { $gt: 7, $lte: 14 } });
          break;
        case 'ghost':
          qb.andWhere({ ghostDays: { $gt: 14 } });
          break;
      }
    }

    // 5. Sort by kanbanOrder ASC
    qb.orderBy({ kanbanOrder: 'asc' });

    const jobs = await qb.getResultList();

    // 6. Group by status
    const grouped = this.groupByStatus(jobs);

    // 7. Build all 6 columns (including empty ones)
    const columns = this.buildColumns(grouped);

    // 8. Calculate stats from the full job set
    const stats = this.calculateStats(jobs);

    return { columns, stats };
  }

  /**
   * Get dashboard statistics: total jobs, per-status counts, ghost alerts, recent activity.
   * Uses a separate query (no filters) for accurate global stats.
   */
  async getStats(userId: string): Promise<DashboardStatsDto> {
    const jobs = await this.em.find(Job, { user: userId });
    return this.calculateStats(jobs);
  }

  /**
   * Group an array of Job entities into a Map keyed by JobStatus,
   * with each job mapped to a KanbanCardDto projection.
   */
  private groupByStatus(jobs: Job[]): Map<JobStatus, KanbanCardDto[]> {
    const grouped = new Map<JobStatus, KanbanCardDto[]>();

    // Initialize all statuses with empty arrays
    for (const status of COLUMN_ORDER) {
      grouped.set(status, []);
    }

    for (const job of jobs) {
      const card: KanbanCardDto = {
        id: job.id,
        title: job.title,
        company: job.company,
        location: job.location,
        ghostDays: job.ghostDays,
        status: job.status,
        kanbanOrder: job.kanbanOrder,
        lastActivityAt: job.lastActivityAt,
        createdAt: job.createdAt,
      };

      const cards = grouped.get(job.status);
      if (cards) {
        cards.push(card);
      }
    }

    return grouped;
  }

  /**
   * Convert the grouped map into an ordered array of KanbanColumnDto.
   * All 6 columns are always present, even if empty.
   */
  private buildColumns(
    grouped: Map<JobStatus, KanbanCardDto[]>,
  ): KanbanColumnDto[] {
    return COLUMN_ORDER.map((status) => {
      const config = COLUMN_CONFIG[status];
      return {
        status,
        label: config.label,
        color: config.color,
        jobs: grouped.get(status) ?? [],
      };
    });
  }

  /**
   * Calculate stats from a list of jobs.
   */
  private calculateStats(jobs: Job[]): DashboardStatsDto {
    const totalJobs = jobs.length;

    // Count by status — initialize all to 0
    const byStatus = {} as Record<JobStatus, number>;
    for (const status of COLUMN_ORDER) {
      byStatus[status] = 0;
    }
    for (const job of jobs) {
      byStatus[job.status] = (byStatus[job.status] ?? 0) + 1;
    }

    // Ghost alerts: jobs with ghostDays > 14
    const ghostAlerts = jobs.filter((job) => job.ghostDays > 14).length;

    // Recent activity: jobs with lastActivityAt within the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivity = jobs.filter((job) => {
      const activityDate = job.lastActivityAt ?? job.createdAt;
      return activityDate >= sevenDaysAgo;
    }).length;

    return { totalJobs, byStatus, ghostAlerts, recentActivity };
  }
}
