import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service.js';
import { ReminderModule } from '../reminder/reminder.module.js';
import { NotificationModule } from '../notification/notification.module.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ReminderModule,
    NotificationModule,
  ],
  providers: [SchedulerService],
})
export class SchedulerModule {}
