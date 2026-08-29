import { AppError } from '@/shared/errors.js'
import { logger } from '@/shared/logger.js'
import { pushRepository } from './push.repository.js'
import type { DeviceTokenRow } from '@/db/schema/device-tokens.js'
import type { RegisterDeviceInput } from './push.schema.js'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
const SEND_TIMEOUT_MS = 10_000

export interface PushMessage {
  title: string
  body: string
  data?: Record<string, string>
}

/** One Expo push ticket; only the fields we act on. */
interface ExpoTicket {
  status?: string
  details?: { error?: string }
}

async function registerDevice(userId: string, input: RegisterDeviceInput): Promise<DeviceTokenRow> {
  return pushRepository.upsert({ userId, token: input.token, platform: input.platform })
}

async function unregisterDevice(userId: string, token: string): Promise<void> {
  const removed = await pushRepository.remove(userId, token)
  if (!removed) throw new AppError('NOT_FOUND', 'Device token not found')
}

/**
 * Best-effort delivery to every device the user has registered. Never throws:
 * push is a side channel and must not fail the write that triggered it.
 *
 * ponytail: one POST, no chunking and no receipt polling — Expo caps a request
 * at 100 messages and a user owns single-digit phones. Dead tokens are pruned
 * from the immediate tickets; add a receipts sweep if silent drops show up.
 */
async function sendToUser(userId: string, message: PushMessage): Promise<void> {
  try {
    const devices = await pushRepository.listForUser(userId)
    if (devices.length === 0) return

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(
        devices.map((d) => ({ to: d.token, sound: 'default', ...message })),
      ),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    })

    const payload = (await response.json()) as { data?: unknown }
    if (!response.ok) {
      logger.warn({ status: response.status, userId }, 'expo push send returned non-ok')
      return
    }

    // Tickets come back in the order the messages were sent.
    const tickets = Array.isArray(payload.data) ? (payload.data as ExpoTicket[]) : []
    const dead = devices
      .filter((_, i) => tickets[i]?.details?.error === 'DeviceNotRegistered')
      .map((d) => d.token)
    if (dead.length > 0) await pushRepository.removeTokens(dead)
  } catch (err) {
    logger.warn({ err, userId }, 'expo push send failed')
  }
}

export const pushService = { registerDevice, unregisterDevice, sendToUser }
