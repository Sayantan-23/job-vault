import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { TimelineService } from './timeline.service.js';
import { TimelineController } from './timeline.controller.js';
import { TimelineEvent } from './entities/timeline-event.entity.js';
import { Job } from '../job/entities/job.entity.js';

@Module({
  imports: [MikroOrmModule.forFeature([TimelineEvent, Job])],
  controllers: [TimelineController],
  providers: [TimelineService],
  exports: [TimelineService],
})
export class TimelineModule {}
