import type { JobStatus } from '../../job/enums/job-status.enum.js';
import type { DashboardStatsDto } from './dashboard-stats.dto.js';

export class KanbanCardDto {
  id!: string;
  title!: string;
  company!: string;
  location?: string;
  ghostDays!: number;
  status!: JobStatus;
  kanbanOrder!: number;
  lastActivityAt?: Date;
  createdAt!: Date;
}

export class KanbanColumnDto {
  status!: JobStatus;
  label!: string;
  color!: string;
  jobs!: KanbanCardDto[];
}

export class KanbanBoardResponseDto {
  columns!: KanbanColumnDto[];
  stats!: DashboardStatsDto;
}
