import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import { getEnv } from '@/config/env.js'
import * as schema from './schema/index.js'

const { Pool } = pg

export type Db = ReturnType<typeof drizzle<typeof schema>>

let _pool: pg.Pool | undefined
let _db: Db | undefined

function getPool(): pg.Pool {
  if (_pool) return _pool
  const env = getEnv()
  _pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30_000,
  })
  return _pool
}

export function getDb(): Db {
  if (_db) return _db
  _db = drizzle(getPool(), { schema })
  return _db
}

export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end()
    _pool = undefined
    _db = undefined
  }
}

