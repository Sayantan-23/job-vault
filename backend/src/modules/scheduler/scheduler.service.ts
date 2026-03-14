import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EntityManager } from '@mikro-orm/postgresql';
import { Job } from '../job/entities/job.entity.js';
import { JobStatus } from '../job/enums/job-status.enum.js';
import { ReminderService } from '../reminder/reminder.service.js';
import { NotificationService } from '../notification/notification.service.js';
import { NotificationType } from '../notification/entities/notification.entity.js';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly em: EntityManager,
    private readonly reminderService: ReminderService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Daily at midnight: update ghostDays for all active (non-archived) jobs.
   * Creates GHOST_ALERT notifications when thresholds are crossed.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async updateGhostDays(): Promise<void> {
    this.logger.log('Running daily ghost days update...');

    // Use a forked EntityManager to avoid conflicts with other operations
    const fork = this.em.fork();

    try {
      // Fetch all non-archived jobs
      const jobs = await fork.find(
        Job,
        { status: { $ne: JobStatus.ARCHIVED } },
        { populate: ['user'] },
      );

      const now = new Date();

      for (const job of jobs) {
        const referenceDate = job.lastActivityAt || job.createdAt;
        const diffMs = now.getTime() - referenceDate.getTime();
        const newGhostDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const previousGhostDays = job.ghostDays;

        // Update ghostDays
        job.ghostDays = newGhostDays;

        // Check if thresholds were crossed (7-day and 14-day boundaries)
        const userId = typeof job.user === 'string' ? job.user : job.user.id;

        // Crossed 7-day threshold (was <=7, now >7)
        if (previousGhostDays <= 7 && newGhostDays > 7) {
          await this.notificationService.create(
            userId,
            `${job.company} - ${job.title} has been inactive for ${newGhostDays} days`,
            NotificationType.GHOST_ALERT,
            job.id,
          );
          this.logger.log(
            `Ghost warning: ${job.company} - ${job.title} (${newGhostDays} days)`,
          );
        }

        // Crossed 14-day threshold (was <=14, now >14)
        if (previousGhostDays <= 14 && newGhostDays > 14) {
          await this.notificationService.create(
            userId,
            `Ghost alert: ${job.company} - ${job.title} - no activity for ${newGhostDays} days`,
            NotificationType.GHOST_ALERT,
            job.id,
          );
          this.logger.log(
            `Ghost alert: ${job.company} - ${job.title} (${newGhostDays} days)`,
          );
        }
      }

      await fork.flush();
      this.logger.log(`Updated ghost days for ${jobs.length} jobs`);
    } catch (error) {
      this.logger.error('Failed to update ghost days', error);
    }
  }

  /**
   * Every 10 minutes: check for due reminders and create notifications.
   * Marks reminders as completed to prevent re-notification.
   */
  @Cron('*/10 * * * *')
  async checkReminders(): Promise<void> {
    this.logger.log('Checking for due reminders...');

    try {
      const dueReminders = await this.reminderService.getDueReminders();

      for (const reminder of dueReminders) {
        const userId =
          typeof reminder.user === 'string' ? reminder.user : reminder.user.id;
        const jobId =
          typeof reminder.job === 'string' ? reminder.job : reminder.job.id;

        // Create notification for the due reminder
        await this.notificationService.create(
          userId,
          reminder.message,
          NotificationType.REMINDER,
          jobId,
        );

        // Mark reminder as completed (notification sent)
        reminder.isCompleted = true;
      }

      if (dueReminders.length > 0) {
        await this.em.flush();
        this.logger.log(
          `Processed ${dueReminders.length} due reminder(s)`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to check reminders', error);
    }
  }
}
