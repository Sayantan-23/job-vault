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
//
// `previousTokenHash` + `rotatedAt` give rotation a short grace window: two tabs
// refreshing at once both present the same token, and the loser must get a
// working pair back instead of tripping reuse detection.
export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    previousTokenHash: text('previous_token_hash'),
    rotatedAt: timestamp('rotated_at', { withTimezone: true }),
    client: sessionClientEnum('client').notNull(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    // Absolute cap set once at login and never extended by rotation, so an
    // endlessly-refreshed session still dies on schedule.
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [index('idx_user_sessions_user_id').on(t.userId)],
)

export type UserSessionRow = typeof userSessions.$inferSelect
export type NewUserSessionRow = typeof userSessions.$inferInsert
