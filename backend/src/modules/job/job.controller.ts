import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JobService } from './job.service.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { CreateJobFromUrlDto } from './dto/create-job-from-url.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';
import { MoveJobDto } from './dto/move-job.dto.js';
import { JobQueryDto } from './dto/job-query.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('jobs')
@UseGuards(JwtAuthGuard)
export class JobController {
  constructor(private readonly jobService: JobService) {}

  /**
   * POST /api/jobs
   * Create a new job manually
   */
  @Post()
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateJobDto,
  ) {
    return this.jobService.create(userId, dto);
  }

  /**
   * POST /api/jobs/scrape
   * Scrape job posting from URL (preview only)
   */
  @Post('scrape')
  async scrape(@Body() dto: CreateJobFromUrlDto) {
    return this.jobService.scrapeFromUrl(dto.sourceUrl);
  }

  /**
   * GET /api/jobs
   * List user's jobs with search, status, ghost filters and pagination
   */
  @Get()
  async findAll(
    @CurrentUser('id') userId: string,
    @Query() query: JobQueryDto,
  ) {
    return this.jobService.findAll(userId, query);
  }

  /**
   * GET /api/jobs/:id
   * Get a single job by ID (must belong to current user)
   */
  @Get(':id')
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.jobService.findOne(userId, id);
  }

  /**
   * PATCH /api/jobs/:id
   * Update job fields
   */
  @Patch(':id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobService.update(userId, id, dto);
  }

  /**
   * PATCH /api/jobs/:id/move
   * Move job to new status and/or kanban position
   */
  @Patch(':id/move')
  async move(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveJobDto,
  ) {
    return this.jobService.move(userId, id, dto);
  }

  /**
   * DELETE /api/jobs/:id
   * Delete a job
   */
  @Delete(':id')
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.jobService.delete(userId, id);
    return { message: 'Job deleted successfully' };
  }
}
