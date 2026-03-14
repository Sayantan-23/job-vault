import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { NotificationService } from './notification.service.js';
import { NotificationQueryDto } from './dto/notification-query.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * GET /api/notifications
   * Get user's notifications (supports ?unreadOnly=true)
   */
  @Get()
  async getUserNotifications(
    @CurrentUser('id') userId: string,
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationService.getUserNotifications(userId, query);
  }

  /**
   * PATCH /api/notifications/read-all
   * Mark all notifications as read
   * Note: This route must be defined BEFORE :id/read to avoid route conflicts
   */
  @Patch('read-all')
  async markAllRead(@CurrentUser('id') userId: string) {
    await this.notificationService.markAllRead(userId);
    return { message: 'All notifications marked as read' };
  }

  /**
   * PATCH /api/notifications/:id/read
   * Mark a single notification as read
   */
  @Patch(':id/read')
  async markRead(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.notificationService.markRead(id, userId);
  }
}
