import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ReminderService } from './reminder.service.js';
import { CreateReminderDto } from './dto/create-reminder.dto.js';
import { UpdateReminderDto } from './dto/update-reminder.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@Controller()
@UseGuards(JwtAuthGuard)
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  /**
   * GET /api/jobs/:jobId/reminders
   * Get all reminders for a job
   */
  @Get('jobs/:jobId/reminders')
  async getJobReminders(
    @CurrentUser('id') userId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ) {
    return this.reminderService.getJobReminders(jobId, userId);
  }

  /**
   * POST /api/jobs/:jobId/reminders
   * Create a new reminder for a job
   */
  @Post('jobs/:jobId/reminders')
  async create(
    @CurrentUser('id') userId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: CreateReminderDto,
  ) {
    return this.reminderService.create(jobId, userId, dto);
  }

  /**
   * PATCH /api/reminders/:id
   * Update a reminder
   */
  @Patch('reminders/:id')
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReminderDto,
  ) {
    return this.reminderService.update(id, userId, dto);
  }

  /**
   * DELETE /api/reminders/:id
   * Delete a reminder
   */
  @Delete('reminders/:id')
  async remove(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.reminderService.delete(id, userId);
    return { message: 'Reminder deleted successfully' };
  }
}
