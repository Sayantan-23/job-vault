import { getEnv } from '@/config/env.js'
import { AppError } from '@/shared/errors.js'
import { aiUsageRepository } from './ai-usage.repository.js'

export async function assertWithinRateLimit(userId: string): Promise<void> {
  const limit = getEnv().AI_RATE_LIMIT_PER_HOUR
  const since = new Date(Date.now() - 60 * 60 * 1000)
  const used = await aiUsageRepository.countRecentGenerations(userId, since)
  if (used >= limit) {
    throw new AppError('RATE_LIMITED', `AI generation limit reached (${limit}/hour). Please try again later.`)
  }
}
