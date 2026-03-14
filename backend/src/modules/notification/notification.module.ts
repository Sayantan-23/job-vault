import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { NotificationService } from './notification.service.js';
import { NotificationController } from './notification.controller.js';
import { Notification } from './entities/notification.entity.js';

@Module({
  imports: [MikroOrmModule.forFeature([Notification])],
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
