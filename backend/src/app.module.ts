import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import mikroOrmConfig from './config/mikro-orm.config.js';
import appConfig from './config/app.config.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { JobModule } from './modules/job/job.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { TimelineModule } from './modules/timeline/timeline.module.js';
import { ReminderModule } from './modules/reminder/reminder.module.js';
import { NotificationModule } from './modules/notification/notification.module.js';
import { SchedulerModule } from './modules/scheduler/scheduler.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    MikroOrmModule.forRoot(mikroOrmConfig),
    AuthModule,
    JobModule,
    DashboardModule,
    TimelineModule,
    ReminderModule,
    NotificationModule,
    SchedulerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
