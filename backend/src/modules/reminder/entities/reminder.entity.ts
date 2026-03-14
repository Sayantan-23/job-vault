import { Entity, Property, ManyToOne } from '@mikro-orm/core';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Job } from '../../job/entities/job.entity.js';
import { User } from '../../auth/entities/user.entity.js';

@Entity({ tableName: 'reminders' })
export class Reminder extends BaseEntity {
  @ManyToOne(() => Job, { deleteRule: 'cascade' })
  job!: Job;

  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Property()
  message!: string;

  @Property({ type: 'timestamptz' })
  remindAt!: Date;

  @Property({ default: false })
  isCompleted: boolean = false;
}
