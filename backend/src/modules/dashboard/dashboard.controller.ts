import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import { DashboardQueryDto } from './dto/dashboard-query.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * GET /api/dashboard/kanban
   * Returns the full Kanban board: 6 columns with jobs grouped by status,
   * plus aggregated dashboard statistics.
   */
  @Get('kanban')
  async getKanbanBoard(
    @CurrentUser('id') userId: string,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboardService.getKanbanBoard(userId, query);
  }

  /**
   * GET /api/dashboard/stats
   * Returns dashboard statistics: total jobs, per-status counts,
   * ghost alert count, and recent activity count.
   */
  @Get('stats')
  async getStats(@CurrentUser('id') userId: string) {
    return this.dashboardService.getStats(userId);
  }
}
