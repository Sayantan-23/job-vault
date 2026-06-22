import { detectPlatform } from '@/content/detector'
import { scrape, type ScrapeResult } from '@/lib/api'
import { EXTRACT } from '@/lib/messages'
import type { ExtractedJobData } from '@/lib/types'

// Reads the active tab. For LinkedIn/Indeed, asks the content script to extract
// from the live DOM (the bot-wall-proof path). Otherwise — or if the content
// script isn't present / came back empty — falls back to the backend scrape.
export async function capturePage(serverUrl: string, token: string): Promise<ExtractedJobData> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  const tab = tabs[0]
  const url = tab?.url ?? ''
  const platform = detectPlatform(url)

  if ((platform === 'linkedin' || platform === 'indeed') && tab?.id != null) {
    try {
      const data = (await chrome.tabs.sendMessage(tab.id, { type: EXTRACT })) as ExtractedJobData | undefined
      if (data && data.confidence !== 'empty') return data
    } catch {
      // Content script not injected (e.g. the tab predates the install) — fall through.
    }
  }

  const scraped = await scrape(serverUrl, token, url)
  return scrapeToExtracted(scraped, url)
}

function scrapeToExtracted(result: ScrapeResult, url: string): ExtractedJobData {
  return {
    title: result.title,
    company: result.company,
    location: result.location,
    salaryRange: result.salaryRange,
    description: result.snapshotMarkdown,
    sourceUrl: url,
    platform: 'generic',
    confidence: result.status,
  }
}
