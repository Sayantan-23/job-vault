import { pgTable, uuid, varchar, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'
import { jobs } from './jobs.js'

// Single source of truth for both the Postgres enums and the Zod request
// schemas (imported by contacts.schema.ts) — same pattern as JOB_STATUSES.
export const CONTACT_CHANNELS = ['EMAIL', 'LINKEDIN', 'OTHER'] as const
export type ContactChannel = (typeof CONTACT_CHANNELS)[number]
export const contactChannelEnum = pgEnum('contact_channel', CONTACT_CHANNELS)

export const CONTACT_STATUSES = ['NO_RESPONSE', 'HEARD_BACK', 'REFERRED', 'DECLINED'] as const
export type ContactStatus = (typeof CONTACT_STATUSES)[number]
export const contactStatusEnum = pgEnum('contact_status', CONTACT_STATUSES)

export const jobContacts = pgTable(
  'job_contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'cascade' }),
    // Free text: name, email, LinkedIn URL, or any combo. The app never sends
    // email, so no machine ever needs a parsed address — one field suffices.
    contact: varchar('contact', { length: 500 }).notNull(),
    channel: contactChannelEnum('channel'),
    status: contactStatusEnum('status').notNull().default('NO_RESPONSE'),
    // Editable so outreach can be logged retroactively.
    reachedOutAt: timestamp('reached_out_at', { withTimezone: true }).notNull().defaultNow(),
    notes: text('notes'),
  },
  (t) => [
    index('idx_job_contacts_user_id').on(t.userId),
    index('idx_job_contacts_job_id').on(t.jobId),
  ],
)

export type JobContactRow = typeof jobContacts.$inferSelect
export type NewJobContactRow = typeof jobContacts.$inferInsert
