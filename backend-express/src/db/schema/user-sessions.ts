import { pgTable, uuid, text, timestamp, pgEnum, index } from 'drizzle-orm/pg-core'
import { users } from './users.js'

export const SESSION_CLIENTS = ['web', 'native'] as const

export type SessionClient = (typeof SESSION_CLIENTS)[number]

export const sessionClientEnum = pgEnum('session_client', SESSION_CLIENTS)

// One row per signed-in device, replacing the single `users.refresh_token_hash`
// column that could only ever hold one refresh token per account (t-0cd55z).
//
// `tokenHash` is the SHA-256 of the refresh token — never bcrypt: bcrypt
// truncates at 72 bytes and two refresh JWTs for the same user share their
// first 72, so every rotation compared equal and reuse detection never fired.
// UNIQUE globally: a hash identifies exactly one session, so a replayed token
// can never resolve to a second row.
export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    client: sessionClientEnum('client').notNull(),
    label: text('label'),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('idx_user_sessions_user_id').on(t.userId)],
)

export type UserSessionRow = typeof userSessions.$inferSelect
export type NewUserSessionRow = typeof userSessions.$inferInsert
