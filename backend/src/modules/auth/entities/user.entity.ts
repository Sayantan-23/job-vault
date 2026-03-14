import { Entity, Property, Unique } from '@mikro-orm/core';
import { BaseEntity } from '../../../common/entities/base.entity.js';

@Entity({ tableName: 'users' })
export class User extends BaseEntity {
  @Property()
  name!: string;

  @Property()
  @Unique()
  email!: string;

  @Property({ nullable: true, hidden: true })
  passwordHash?: string;

  @Property({ nullable: true })
  @Unique()
  googleId?: string;

  @Property({ default: false })
  isEmailVerified: boolean = false;

  @Property({ nullable: true })
  masterResumeUrl?: string;

  @Property({ type: 'json', nullable: true })
  masterProfileJson?: Record<string, any>;

  @Property({ type: 'json', nullable: true })
  preferences?: {
    theme?: 'light' | 'dark' | 'system';
    defaultView?: 'kanban' | 'list';
  };

  @Property({ nullable: true, hidden: true })
  refreshTokenHash?: string;
}
