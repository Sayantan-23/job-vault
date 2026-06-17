import { geminiService } from '@/modules/ai/gemini.service.js'
import { assertWithinRateLimit } from '@/modules/ai/ai.rate-limit.js'
import { aiUsageRepository } from '@/modules/ai/ai-usage.repository.js'
import { logger } from '@/shared/logger.js'
import { renderUrl } from './render.js'
import { extractJobFromContent } from './extract.js'
import { sanitizeSnapshotMarkdown } from './markdown.js'
import type { PartialScrape, ScrapeFallback } from './scraper.js'

const AI_USAGE_KIND = 'job-scrape-extract'

// Builds the scrape pipeline's second pass for a given user, invoked only when
// the static fetch yields a shell (CSR SPA / bot-protected page). It renders the
// URL with a JS-capable provider, then — when AI is configured AND the user is
// within their hourly AI budget — normalizes the rendered content into clean
// structured fields. The LLM runs over RENDERED content (real data), never the
// empty shell, which is the only way it can actually help.
//
// AI spend is rate-limited and metered exactly like résumé/cover-letter
// generation, so scraping can't be used to bypass the budget. When the budget is
// exhausted (or extraction fails), we degrade to the raw rendered snapshot rather
// than failing the scrape. Returns null when rendering produces nothing.
export function createScrapeFallback(userId: string): ScrapeFallback {
  return async (_html, url) => {
    const rendered = await renderUrl(url)
    if (!rendered) return null

    // The raw render is the baseline snapshot (noisy — includes page chrome).
    const renderedSnapshot = sanitizeSnapshotMarkdown(rendered.markdown)
    const base: PartialScrape = { source: 'render' }
    if (rendered.title) base.title = rendered.title
    if (renderedSnapshot) base.snapshotMarkdown = renderedSnapshot

    if (geminiService.isAiEnabled() && renderedSnapshot.trim() && (await withinAiBudget(userId))) {
      try {
        // Feed the AI the sanitized content so its token budget is spent on real
        // text, not image/decoy markup.
        const ai = await extractJobFromContent(renderedSnapshot, url)
        // The model call happened — meter it regardless of how useful the result was.
        await recordAiUsage(userId)
        if (ai) {
          return {
            title: ai.title ?? base.title,
            company: ai.company ?? base.company,
            location: ai.location ?? base.location,
            salaryRange: ai.salaryRange ?? base.salaryRange,
            // Prefer the AI's chrome-free description; keep the raw render otherwise.
            snapshotMarkdown: ai.snapshotMarkdown ?? base.snapshotMarkdown,
            source: 'ai',
          }
        }
      } catch (err) {
        // Best-effort: a failed extraction still leaves us the rendered content.
        logger.warn({ err, url }, 'AI extraction over rendered content failed')
      }
    }

    return base
  }
}

// True when the user has budget left. A spent budget degrades to the raw render
// (skip AI) rather than failing the whole scrape.
async function withinAiBudget(userId: string): Promise<boolean> {
  try {
    await assertWithinRateLimit(userId)
    return true
  } catch {
    logger.info({ userId }, 'scrape AI extraction skipped — hourly AI budget reached')
    return false
  }
}

async function recordAiUsage(userId: string): Promise<void> {
  try {
    await aiUsageRepository.recordUsageEvent(userId, AI_USAGE_KIND)
  } catch (err) {
    logger.warn({ err, userId }, 'failed to record scrape AI usage event')
  }
}
