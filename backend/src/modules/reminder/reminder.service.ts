import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Reminder } from './entities/reminder.entity.js';
import { CreateReminderDto } from './dto/create-reminder.dto.js';
import { UpdateReminderDto } from './dto/update-reminder.dto.js';
import { Job } from '../job/entities/job.entity.js';
import { User } from '../auth/entities/user.entity.js';

@Injectable()
export class ReminderService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Get all reminders for a job, scoped by userId.
   */
  async getJobReminders(jobId: string, userId: string): Promise<Reminder[]> {
    // Verify job belongs to user
    const job = await this.em.findOne(Job, { id: jobId, user: userId });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    return this.em.find(
      Reminder,
      { job: jobId, user: userId },
      { orderBy: { remindAt: 'asc' } },
    );
  }

  /**
   * Create a new reminder for a job.
   */
  async create(
    jobId: string,
    userId: string,
    dto: CreateReminderDto,
  ): Promise<Reminder> {
    // Verify job belongs to user
    const job = await this.em.findOne(Job, { id: jobId, user: userId });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    const user = this.em.getReference(User, userId);

    const reminder = this.em.create(Reminder, {
      job,
      user,
      message: dto.message,
      remindAt: new Date(dto.remindAt),
    });

    await this.em.persistAndFlush(reminder);
    return reminder;
  }

  /**
   * Update an existing reminder (message, remindAt, isCompleted).
   */
  async update(
    id: string,
    userId: string,
    dto: UpdateReminderDto,
  ): Promise<Reminder> {
    const reminder = await this.em.findOne(Reminder, { id, user: userId });
    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    if (dto.message !== undefined) reminder.message = dto.message;
    if (dto.remindAt !== undefined) reminder.remindAt = new Date(dto.remindAt);
    if (dto.isCompleted !== undefined) reminder.isCompleted = dto.isCompleted;

    await this.em.flush();
    return reminder;
  }

  /**
   * Delete a reminder by ID, scoped by userId.
   */
  async delete(id: string, userId: string): Promise<void> {
    const reminder = await this.em.findOne(Reminder, { id, user: userId });
    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }

    await this.em.removeAndFlush(reminder);
  }

  /**
   * Get all due reminders (remindAt <= now AND isCompleted = false).
   * Used by the scheduler — no user scoping needed.
   */
  async getDueReminders(): Promise<Reminder[]> {
    return this.em.find(
      Reminder,
      {
        remindAt: { $lte: new Date() },
        isCompleted: false,
      },
      { populate: ['job', 'user'] },
    );
  }
}
