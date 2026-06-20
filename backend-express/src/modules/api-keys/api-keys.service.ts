import { randomBytes } from 'node:crypto'
import { AppError } from '@/shared/errors.js'
import { logger } from '@/shared/logger.js'
import { hashSecret, compareSecret } from '@/modules/auth/auth.tokens.js'
import { apiKeysRepository } from './api-keys.repository.js'
import type { ApiKeyRow } from '@/db/schema/api-keys.js'
import type { ApiKeyPublic, CreatedApiKey } from './api-keys.schema.js'

const KEY_PREFIX = 'jv_'
const SECRET_BYTES = 24 // → 48 hex chars
// `jv_` + first 8 hex chars of the secret; non-secret, stored plaintext + indexed.
const PREFIX_LEN = KEY_PREFIX.length + 8

/** Raw key shape: `jv_<48 hex>`. The `keyPrefix` is the leading `jv_xxxxxxxx`. */
function generateRawKey(): { rawKey: string; keyPrefix: string } {
  const rawKey = KEY_PREFIX + randomBytes(SECRET_BYTES).toString('hex')
  return { rawKey, keyPrefix: rawKey.slice(0, PREFIX_LEN) }
}

function toPublic(row: ApiKeyRow): ApiKeyPublic {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.keyPrefix,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
  }
}

async function createKey(userId: string, name: string): Promise<CreatedApiKey> {
  const { rawKey, keyPrefix } = generateRawKey()
  const keyHash = await hashSecret(rawKey)
  const row = await apiKeysRepository.create({ userId, name, keyPrefix, keyHash })
  return { ...toPublic(row), rawKey }
}

async function list(userId: string): Promise<ApiKeyPublic[]> {
  const rows = await apiKeysRepository.listActiveForUser(userId)
  return rows.map(toPublic)
}

async function revoke(userId: string, id: string): Promise<void> {
  const ok = await apiKeysRepository.revoke(userId, id)
  if (!ok) throw new AppError('NOT_FOUND', 'API key not found')
}

/**
 * Verifies a raw `X-API-Key`. Narrows to active rows by prefix, then bcrypt-
 * compares. On success, best-effort stamps last-used and returns the owner.
 * Returns null for any non-match (caller maps that to 401).
 */
async function verifyRawKey(rawKey: string): Promise<{ id: string; userId: string } | null> {
  if (!rawKey.startsWith(KEY_PREFIX) || rawKey.length < PREFIX_LEN) return null
  const keyPrefix = rawKey.slice(0, PREFIX_LEN)
  const candidates = await apiKeysRepository.findActiveByPrefix(keyPrefix)
  for (const row of candidates) {
    if (await compareSecret(rawKey, row.keyHash)) {
      apiKeysRepository.touchLastUsed(row.id).catch((err: unknown) => {
        logger.warn({ err, apiKeyId: row.id }, 'failed to stamp api key last-used')
      })
      return { id: row.id, userId: row.userId }
    }
  }
  return null
}

export const apiKeysService = { createKey, list, revoke, verifyRawKey }
