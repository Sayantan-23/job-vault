import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'

// Long-lived bearer secrets used by the Chrome extension (X-API-Key header).
// Deliberately NOT JWTs: the extension needs durable auth across third-party
// origins, and JWT expiry would force a re-connect. The raw key is shown once
// at creation; only its bcrypt hash is stored. `keyPrefix` is a non-secret
// `jv_xxxxxxxx` slice kept in plaintext for display + fast lookup (the verify
// path narrows to active rows by prefix before the bcrypt compare).
export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    keyPrefix: varchar('key_prefix', { length: 20 }).notNull(),
    keyHash: text('key_hash').notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_api_keys_user_id').on(t.userId),
    index('idx_api_keys_key_prefix').on(t.keyPrefix),
  ],
)

export type ApiKeyRow = typeof apiKeys.$inferSelect
export type NewApiKeyRow = typeof apiKeys.$inferInsert
