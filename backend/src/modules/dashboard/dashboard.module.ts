import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { DashboardService } from './dashboard.service.js';
import { DashboardController } from './dashboard.controller.js';
import { Job } from '../job/entities/job.entity.js';

@Module({
  imports: [MikroOrmModule.forFeature([Job])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
