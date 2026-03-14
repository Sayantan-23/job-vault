import { Entity, Property, ManyToOne, Enum, Index } from '@mikro-orm/core';
import { BaseEntity } from '../../../common/entities/base.entity.js';
import { User } from '../../auth/entities/user.entity.js';
import { JobStatus } from '../enums/job-status.enum.js';

@Entity({ tableName: 'jobs' })
export class Job extends BaseEntity {
  @ManyToOne(() => User, { deleteRule: 'cascade' })
  user!: User;

  @Property()
  @Index()
  title!: string;

  @Property()
  @Index()
  company!: string;

  @Property({ nullable: true })
  location?: string;

  @Property({ nullable: true })
  salaryRange?: string;

  @Property({ nullable: true, length: 2000 })
  sourceUrl?: string;

  @Property({ nullable: true, type: 'text' })
  snapshotMarkdown?: string;

  @Enum(() => JobStatus)
  @Index()
  status: JobStatus = JobStatus.WISHLIST;

  @Property({ type: 'float', default: 0 })
  kanbanOrder: number = 0;

  @Property({ nullable: true, type: 'timestamptz' })
  lastActivityAt?: Date;

  @Property({ type: 'int', default: 0 })
  ghostDays: number = 0;

  @Property({ nullable: true, type: 'text' })
  notes?: string;
}
