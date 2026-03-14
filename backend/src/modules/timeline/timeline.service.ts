import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { TimelineEvent, TimelineEventType } from './entities/timeline-event.entity.js';
import { CreateTimelineEventDto } from './dto/create-timeline-event.dto.js';
import { Job } from '../job/entities/job.entity.js';

@Injectable()
export class TimelineService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Get all timeline events for a job, ordered by createdAt DESC.
   * Verifies job ownership by userId.
   */
  async getJobTimeline(jobId: string, userId: string): Promise<TimelineEvent[]> {
    // Verify job belongs to user
    const job = await this.em.findOne(Job, { id: jobId, user: userId });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return this.em.find(
      TimelineEvent,
      { job: jobId },
      { orderBy: { createdAt: 'desc' } },
    );
  }

  /**
   * Add a manual timeline entry for a job.
   * Updates job.lastActivityAt.
   */
  async addManualEntry(
    jobId: string,
    userId: string,
    dto: CreateTimelineEventDto,
  ): Promise<TimelineEvent> {
    // Verify job belongs to user
    const job = await this.em.findOne(Job, { id: jobId, user: userId });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const event = this.em.create(TimelineEvent, {
      job,
      type: TimelineEventType.MANUAL,
      title: dto.title,
      description: dto.description,
    });

    // Update lastActivityAt on the job
    job.lastActivityAt = new Date();

    await this.em.persistAndFlush(event);
    return event;
  }

  /**
   * Add an auto timeline entry (called internally by other services).
   * Does NOT verify user ownership — caller is responsible.
   */
  async addAutoEntry(
    jobId: string,
    title: string,
    description?: string,
  ): Promise<TimelineEvent> {
    const job = this.em.getReference(Job, jobId);

    const event = this.em.create(TimelineEvent, {
      job,
      type: TimelineEventType.AUTO,
      title,
      description,
    });

    await this.em.persistAndFlush(event);
    return event;
  }
}
