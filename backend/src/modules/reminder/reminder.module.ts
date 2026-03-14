import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ReminderService } from './reminder.service.js';
import { ReminderController } from './reminder.controller.js';
import { Reminder } from './entities/reminder.entity.js';
import { Job } from '../job/entities/job.entity.js';

@Module({
  imports: [MikroOrmModule.forFeature([Reminder, Job])],
  controllers: [ReminderController],
  providers: [ReminderService],
  exports: [ReminderService],
})
export class ReminderModule {}
