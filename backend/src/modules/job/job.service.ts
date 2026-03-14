import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Job } from './entities/job.entity.js';
import { CreateJobDto } from './dto/create-job.dto.js';
import { UpdateJobDto } from './dto/update-job.dto.js';
import { MoveJobDto } from './dto/move-job.dto.js';
import { JobQueryDto } from './dto/job-query.dto.js';
import { JobStatus } from './enums/job-status.enum.js';
import { ScraperService } from './services/scraper.service.js';
import type { ScrapeResult } from './services/scraper.service.js';
import { PaginatedResponse } from '../../common/dto/paginated-response.dto.js';
import { User } from '../auth/entities/user.entity.js';
import { TimelineService } from '../timeline/timeline.service.js';

@Injectable()
export class JobService {
  constructor(
    private readonly em: EntityManager,
    private readonly scraperService: ScraperService,
    private readonly timelineService: TimelineService,
  ) {}

  async create(userId: string, dto: CreateJobDto): Promise<Job> {
    const status = dto.status || JobStatus.WISHLIST;

    // Calculate kanbanOrder: max in status column + 1
    const knex = this.em.getKnex();
    const maxOrderResult = await knex('jobs')
      .max('kanban_order as max_order')
      .where({ user_id: userId, status })
      .first<{ max_order: number | null }>();

    const maxOrder = maxOrderResult?.max_order ?? 0;
    const kanbanOrder = maxOrder + 1;

    const user = this.em.getReference(User, userId);
    const now = new Date();

    const job = this.em.create(Job, {
      user,
      title: dto.title,
      company: dto.company,
      location: dto.location,
      salaryRange: dto.salaryRange,
      sourceUrl: dto.sourceUrl,
      snapshotMarkdown: dto.snapshotMarkdown,
      status,
      kanbanOrder,
      lastActivityAt: now,
      notes: dto.notes,
    });

    await this.em.persistAndFlush(job);

    // Add auto timeline entry for job creation
    await this.timelineService.addAutoEntry(
      job.id,
      'Job added to vault',
      `Added to ${status} column`,
    );

    return job;
  }

  async findAll(
    userId: string,
    query: JobQueryDto,
  ): Promise<PaginatedResponse<Job>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const qb = this.em
      .createQueryBuilder(Job, 'j')
      .where({ user: userId });

    // Apply search filter (ILIKE on title, company)
    if (query.search) {
      const searchPattern = `%${query.search}%`;
      qb.andWhere({
        $or: [
          { title: { $ilike: searchPattern } },
          { company: { $ilike: searchPattern } },
        ],
      });
    }

    // Apply status filter
    if (query.status) {
      qb.andWhere({ status: query.status });
    }

    // Apply ghost filter
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

    // Get total count before pagination
    const total = await qb.clone().count();

    // Apply sorting and pagination
    qb.orderBy({ [sortBy]: sortOrder })
      .limit(limit)
      .offset((page - 1) * limit);

    const jobs = await qb.getResultList();

    return new PaginatedResponse<Job>(jobs, total, page, limit);
  }

  async findOne(userId: string, id: string): Promise<Job> {
    const job = await this.em.findOne(Job, { id, user: userId });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  async update(userId: string, id: string, dto: UpdateJobDto): Promise<Job> {
    const job = await this.findOne(userId, id);

    // Update fields from DTO
    if (dto.title !== undefined) job.title = dto.title;
    if (dto.company !== undefined) job.company = dto.company;
    if (dto.location !== undefined) job.location = dto.location;
    if (dto.salaryRange !== undefined) job.salaryRange = dto.salaryRange;
    if (dto.sourceUrl !== undefined) job.sourceUrl = dto.sourceUrl;
    if (dto.snapshotMarkdown !== undefined)
      job.snapshotMarkdown = dto.snapshotMarkdown;
    if (dto.status !== undefined) job.status = dto.status;
    if (dto.notes !== undefined) job.notes = dto.notes;

    // Update lastActivityAt
    job.lastActivityAt = new Date();

    await this.em.flush();
    return job;
  }

  async move(userId: string, id: string, dto: MoveJobDto): Promise<Job> {
    const job = await this.findOne(userId, id);

    const oldStatus = job.status;

    // Update status + kanbanOrder
    job.status = dto.status;
    job.kanbanOrder = dto.kanbanOrder;

    // Update lastActivityAt
    job.lastActivityAt = new Date();

    await this.em.flush();

    // Add auto timeline entry for status change
    if (oldStatus !== dto.status) {
      await this.timelineService.addAutoEntry(
        job.id,
        `Status changed to ${dto.status}`,
        `Moved from ${oldStatus} to ${dto.status}`,
      );
    }

    return job;
  }

  async delete(userId: string, id: string): Promise<void> {
    const job = await this.findOne(userId, id);
    await this.em.removeAndFlush(job);
  }

  async scrapeFromUrl(url: string): Promise<ScrapeResult> {
    try {
      return await this.scraperService.scrape(url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to scrape URL';
      throw new BadRequestException(`Scraping failed: ${message}`);
    }
  }
}
