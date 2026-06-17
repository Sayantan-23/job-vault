import { geminiService } from '@/modules/ai/gemini.service.js'
import { logger } from '@/shared/logger.js'
import { renderUrl } from './render.js'
import { extractJobFromContent } from './extract.js'
import { sanitizeSnapshotMarkdown } from './markdown.js'
import type { PartialScrape, ScrapeFallback } from './scraper.js'

// The scrape pipeline's second pass, invoked only when the static fetch yields a
// shell (CSR SPA / bot-protected page). It renders the URL with a JS-capable
// provider, then — when AI is configured — normalizes the rendered content into
// clean structured fields. The LLM runs over RENDERED content (real data),
// never the empty shell, which is the only way it can actually help.
//
// Returns null when rendering produces nothing (a true dead end), so the
// pipeline falls back to the static result and the client routes to manual entry.
export const renderAndExtract: ScrapeFallback = async (_html, url) => {
  const rendered = await renderUrl(url)
  if (!rendered) return null

  // The raw render is the baseline snapshot (noisy — includes page chrome).
  const renderedSnapshot = sanitizeSnapshotMarkdown(rendered.markdown)
  const base: PartialScrape = { source: 'render' }
  if (rendered.title) base.title = rendered.title
  if (renderedSnapshot) base.snapshotMarkdown = renderedSnapshot

  if (geminiService.isAiEnabled()) {
    try {
      const ai = await extractJobFromContent(rendered.markdown, url)
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
