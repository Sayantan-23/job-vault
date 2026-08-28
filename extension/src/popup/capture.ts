import contentScriptUrl from '@/content/index?iife'
import { scrape, type ScrapeResult } from '@/lib/api'
import { EXTRACT, SCAN_FIELDS, INSERT_ANSWER } from '@/lib/messages'
import type { AnswerField } from '@/content/answer-fields'
import type { ExtractedJobData } from '@/lib/types'

export interface PageRead {
  job: ExtractedJobData
  fields: AnswerField[]
  tabId: number | null
}

// One injection, both signals. The tab strip cannot decide which tab is active
// until it knows whether this page has open-ended fields, so splitting this into
// two passes would mean injecting twice on every popup open.
export async function readPage(serverUrl: string, token: string): Promise<PageRead> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  const tab = tabs[0]
  const url = tab?.url ?? ''
  const tabId = tab?.id ?? null

  let fields: AnswerField[] = []
  let live: ExtractedJobData | null = null

  if (tabId != null && /^https?:/i.test(url)) {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: [contentScriptUrl] })
      const [job, scanned] = await Promise.all([
        chrome.tabs.sendMessage(tabId, { type: EXTRACT }) as Promise<ExtractedJobData | undefined>,
        chrome.tabs.sendMessage(tabId, { type: SCAN_FIELDS }) as Promise<AnswerField[] | undefined>,
      ])
      if (job && job.confidence !== 'empty') live = job
      fields = scanned ?? []
    } catch {
      // Restricted page (chrome://, the Web Store, a PDF) — fall through.
    }
  }

  if (live) return { job: live, fields, tabId }

  const scraped = await scrape(serverUrl, token, url)
  return { job: scrapeToExtracted(scraped, url), fields, tabId }
}

export async function insertAnswer(tabId: number, fieldId: string, text: string): Promise<boolean> {
  try {
    return (await chrome.tabs.sendMessage(tabId, { type: INSERT_ANSWER, fieldId, text })) === true
  } catch {
    return false
  }
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
