import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { JobService } from './job.service.js';
import { JobController } from './job.controller.js';
import { Job } from './entities/job.entity.js';
import { ScraperService } from './services/scraper.service.js';
import { MarkdownService } from './services/markdown.service.js';
import { TimelineModule } from '../timeline/timeline.module.js';

@Module({
  imports: [
    MikroOrmModule.forFeature([Job]),
    TimelineModule,
  ],
  controllers: [JobController],
  providers: [JobService, ScraperService, MarkdownService],
  exports: [JobService],
})
export class JobModule {}
