import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Notification, NotificationType } from './entities/notification.entity.js';
import { NotificationQueryDto } from './dto/notification-query.dto.js';
import { User } from '../auth/entities/user.entity.js';
import { Job } from '../job/entities/job.entity.js';

@Injectable()
export class NotificationService {
  constructor(private readonly em: EntityManager) {}

  /**
   * Get notifications for a user, ordered by createdAt DESC, limit 50.
   * Supports unreadOnly filter.
   */
  async getUserNotifications(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<Notification[]> {
    const where: Record<string, unknown> = { user: userId };

    if (query.unreadOnly) {
      where.isRead = false;
    }

    return this.em.find(Notification, where, {
      orderBy: { createdAt: 'desc' },
      limit: 50,
      populate: ['relatedJob'],
    });
  }

  /**
   * Create a new notification for a user.
   */
  async create(
    userId: string,
    message: string,
    type: NotificationType,
    relatedJobId?: string,
  ): Promise<Notification> {
    const user = this.em.getReference(User, userId);

    const data: Record<string, unknown> = {
      user,
      message,
      type,
    };

    if (relatedJobId) {
      data.relatedJob = this.em.getReference(Job, relatedJobId);
    }

    const notification = this.em.create(Notification, data);
    await this.em.persistAndFlush(notification);
    return notification;
  }

  /**
   * Mark a single notification as read.
   */
  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.em.findOne(Notification, {
      id,
      user: userId,
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;
    await this.em.flush();
    return notification;
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllRead(userId: string): Promise<void> {
    await this.em.nativeUpdate(
      Notification,
      { user: userId, isRead: false },
      { isRead: true },
    );
  }

  /**
   * Get count of unread notifications for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.em.count(Notification, {
      user: userId,
      isRead: false,
    });
  }
}
