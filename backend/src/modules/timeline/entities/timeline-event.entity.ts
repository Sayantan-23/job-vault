import { Entity, Property, ManyToOne, Enum } from '@mikro-orm/core';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { Job } from '../../job/entities/job.entity.js';

export enum TimelineEventType {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

@Entity({ tableName: 'timeline_events' })
export class TimelineEvent extends BaseEntity {
  @ManyToOne(() => Job, { deleteRule: 'cascade' })
  job!: Job;

  @Enum(() => TimelineEventType)
  type!: TimelineEventType;

  @Property()
  title!: string;

  @Property({ nullable: true, type: 'text' })
  description?: string;
}
