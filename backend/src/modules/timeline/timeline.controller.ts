import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TimelineService } from './timeline.service.js';
import { CreateTimelineEventDto } from './dto/create-timeline-event.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('jobs/:jobId/timeline')
@UseGuards(JwtAuthGuard)
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  /**
   * GET /api/jobs/:jobId/timeline
   * Get all timeline events for a job
   */
  @Get()
  async getJobTimeline(
    @CurrentUser('id') userId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    return this.timelineService.getJobTimeline(jobId, userId);
  }

  /**
   * POST /api/jobs/:jobId/timeline
   * Add a manual timeline entry
   */
  @Post()
  async addManualEntry(
    @CurrentUser('id') userId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: CreateTimelineEventDto,
  ) {
    return this.timelineService.addManualEntry(jobId, userId, dto);
  }
}
