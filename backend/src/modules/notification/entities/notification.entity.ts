import { Entity, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { User } from '../../auth/entities/user.entity.js';
import { Job } from '../../job/entities/job.entity.js';

export enum NotificationType {
  GHOST_ALERT = 'GHOST_ALERT',
  REMINDER = 'REMINDER',
  STATUS_CHANGE = 'STATUS_CHANGE',
  GENERAL = 'GENERAL',
}

@Entity({ tableName: 'notifications' })
export class Notification extends BaseEntity {
  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Property()
  message!: string;

  @Enum(() => NotificationType)
  type!: NotificationType;

  @Property({ default: false })
  isRead: boolean = false;

  @ManyToOne(() => Job, { nullable: true, deleteRule: 'set null' })
  relatedJob?: Job;
}
