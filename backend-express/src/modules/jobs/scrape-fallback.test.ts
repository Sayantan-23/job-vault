import { describe, it, expect, vi, beforeEach } from 'vitest'

const { renderUrl, extractJobFromContent, isAiEnabled, assertWithinRateLimit, recordUsageEvent } = vi.hoisted(() => ({
  renderUrl: vi.fn(),
  extractJobFromContent: vi.fn(),
  isAiEnabled: vi.fn(),
  assertWithinRateLimit: vi.fn(),
  recordUsageEvent: vi.fn(),
}))
vi.mock('@/shared/logger.js', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('./render.js', () => ({ renderUrl }))
vi.mock('./extract.js', () => ({ extractJobFromContent }))
vi.mock('@/modules/ai/gemini.service.js', () => ({ geminiService: { isAiEnabled } }))
vi.mock('@/modules/ai/ai.rate-limit.js', () => ({ assertWithinRateLimit }))
vi.mock('@/modules/ai/ai-usage.repository.js', () => ({ aiUsageRepository: { recordUsageEvent } }))

import { createScrapeFallback } from './scrape-fallback.js'

const run = (html: string, url: string) => createScrapeFallback('u1')(html, url)

beforeEach(() => {
  renderUrl.mockReset()
  extractJobFromContent.mockReset()
  isAiEnabled.mockReset()
  assertWithinRateLimit.mockReset().mockResolvedValue(undefined)
  recordUsageEvent.mockReset().mockResolvedValue(undefined)
})

describe('createScrapeFallback', () => {
  it('returns null when rendering yields nothing', async () => {
    renderUrl.mockResolvedValue(null)
    expect(await run('<html/>', 'https://x/1')).toBeNull()
    expect(extractJobFromContent).not.toHaveBeenCalled()
  })

  it('returns the sanitized raw render when AI is disabled', async () => {
    renderUrl.mockResolvedValue({ title: 'Analyst', markdown: '![](data:image/png;base64,AA)\n\nReal body.' })
    isAiEnabled.mockReturnValue(false)
    const r = await run('<html/>', 'https://x/1')
    expect(r).toMatchObject({ title: 'Analyst', source: 'render' })
    expect(r?.snapshotMarkdown).toBe('Real body.')
    expect(extractJobFromContent).not.toHaveBeenCalled()
  })

  it('prefers AI-extracted fields, feeding it sanitized content, and meters the call', async () => {
    renderUrl.mockResolvedValue({ title: 'Raw title', markdown: '![](data:image/png;base64,AA)\n\nnoisy page' })
    isAiEnabled.mockReturnValue(true)
    extractJobFromContent.mockResolvedValue({
      title: 'Quality Analyst',
      company: 'Teleperformance',
      snapshotMarkdown: '# Clean description',
    })
    const r = await run('<html/>', 'https://x/1')
    expect(extractJobFromContent).toHaveBeenCalledWith('noisy page', 'https://x/1')
    expect(recordUsageEvent).toHaveBeenCalledWith('u1', 'job-scrape-extract')
    expect(r).toMatchObject({ title: 'Quality Analyst', company: 'Teleperformance', source: 'ai' })
  })

  it('skips AI (no model call, no metering) when the hourly budget is exhausted', async () => {
    renderUrl.mockResolvedValue({ title: 'Raw title', markdown: 'rendered body text' })
    isAiEnabled.mockReturnValue(true)
    assertWithinRateLimit.mockRejectedValue(new Error('AI generation limit reached'))
    const r = await run('<html/>', 'https://x/1')
    expect(extractJobFromContent).not.toHaveBeenCalled()
    expect(recordUsageEvent).not.toHaveBeenCalled()
    expect(r).toMatchObject({ source: 'render', snapshotMarkdown: 'rendered body text' })
  })

  it('falls back to the raw render when AI extraction throws (still meters? no — call failed)', async () => {
    renderUrl.mockResolvedValue({ title: 'Raw title', markdown: 'rendered body text' })
    isAiEnabled.mockReturnValue(true)
    extractJobFromContent.mockRejectedValue(new Error('quota'))
    const r = await run('<html/>', 'https://x/1')
    expect(recordUsageEvent).not.toHaveBeenCalled()
    expect(r).toMatchObject({ title: 'Raw title', source: 'render', snapshotMarkdown: 'rendered body text' })
  })

  it('falls back to the raw render (but still meters) when AI extraction returns null', async () => {
    renderUrl.mockResolvedValue({ title: 'Raw title', markdown: 'rendered body text' })
    isAiEnabled.mockReturnValue(true)
    extractJobFromContent.mockResolvedValue(null)
    const r = await run('<html/>', 'https://x/1')
    expect(recordUsageEvent).toHaveBeenCalledWith('u1', 'job-scrape-extract')
    expect(r).toMatchObject({ source: 'render', snapshotMarkdown: 'rendered body text' })
  })
})
