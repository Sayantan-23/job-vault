import { z } from 'zod'
import { geminiService } from '@/modules/ai/gemini.service.js'
import { buildJobExtractionPrompt } from '@/modules/ai/ai.prompts.js'
import type { PartialScrape } from './scraper.js'

// AI extraction output. Every field defaults to '' so the model can omit any it
// can't find (generateStructured null-sanitizes + validates); we map empties to
// "absent" below rather than persisting blanks.
export const JobExtractionSchema = z.object({
  title: z.string().default(''),
  company: z.string().default(''),
  location: z.string().default(''),
  salaryRange: z.string().default(''),
  descriptionMarkdown: z.string().default(''),
})

export type JobExtraction = z.infer<typeof JobExtractionSchema>

// Runs the LLM over already-rendered page content to pull clean structured
// fields. Caller must ensure AI is enabled. Returns null when the content is
// empty or the model found nothing usable (so the pipeline keeps the raw render).
export async function extractJobFromContent(content: string, url: string): Promise<PartialScrape | null> {
  const trimmed = content.trim()
  if (!trimmed) return null

  const data = await geminiService.generateStructured(buildJobExtractionPrompt(trimmed, url), JobExtractionSchema)

  const result: PartialScrape = {}
  if (data.title.trim()) result.title = data.title.trim()
  if (data.company.trim()) result.company = data.company.trim()
  if (data.location.trim()) result.location = data.location.trim()
  if (data.salaryRange.trim()) result.salaryRange = data.salaryRange.trim()
  if (data.descriptionMarkdown.trim()) result.snapshotMarkdown = data.descriptionMarkdown.trim()

  // Nothing worth merging — let the caller fall back to the raw render.
  if (!result.title && !result.company && !result.snapshotMarkdown) return null
  return result
}
