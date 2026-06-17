import { describe, it, expect, vi, beforeEach } from 'vitest'

const { renderUrl, extractJobFromContent, isAiEnabled } = vi.hoisted(() => ({
  renderUrl: vi.fn(),
  extractJobFromContent: vi.fn(),
  isAiEnabled: vi.fn(),
}))
vi.mock('@/shared/logger.js', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('./render.js', () => ({ renderUrl }))
vi.mock('./extract.js', () => ({ extractJobFromContent }))
vi.mock('@/modules/ai/gemini.service.js', () => ({ geminiService: { isAiEnabled } }))

import { renderAndExtract } from './scrape-fallback.js'

beforeEach(() => {
  renderUrl.mockReset()
  extractJobFromContent.mockReset()
  isAiEnabled.mockReset()
})

describe('renderAndExtract', () => {
  it('returns null when rendering yields nothing', async () => {
    renderUrl.mockResolvedValue(null)
    expect(await renderAndExtract('<html/>', 'https://x/1')).toBeNull()
    expect(extractJobFromContent).not.toHaveBeenCalled()
  })

  it('returns the sanitized raw render when AI is disabled', async () => {
    renderUrl.mockResolvedValue({ title: 'Analyst', markdown: '![](data:image/png;base64,AA)\n\nReal body.' })
    isAiEnabled.mockReturnValue(false)
    const r = await renderAndExtract('<html/>', 'https://x/1')
    expect(r).toMatchObject({ title: 'Analyst', source: 'render' })
    expect(r?.snapshotMarkdown).toBe('Real body.')
    expect(extractJobFromContent).not.toHaveBeenCalled()
  })

  it('prefers AI-extracted fields when AI is enabled', async () => {
    renderUrl.mockResolvedValue({ title: 'Raw title', markdown: 'noisy rendered page with nav' })
    isAiEnabled.mockReturnValue(true)
    extractJobFromContent.mockResolvedValue({
      title: 'Quality Analyst',
      company: 'Teleperformance',
      snapshotMarkdown: '# Clean description',
    })
    const r = await renderAndExtract('<html/>', 'https://x/1')
    expect(r).toEqual({
      title: 'Quality Analyst',
      company: 'Teleperformance',
      location: undefined,
      salaryRange: undefined,
      snapshotMarkdown: '# Clean description',
      source: 'ai',
    })
  })

  it('falls back to the raw render when AI extraction throws', async () => {
    renderUrl.mockResolvedValue({ title: 'Raw title', markdown: 'rendered body text' })
    isAiEnabled.mockReturnValue(true)
    extractJobFromContent.mockRejectedValue(new Error('quota'))
    const r = await renderAndExtract('<html/>', 'https://x/1')
    expect(r).toMatchObject({ title: 'Raw title', source: 'render', snapshotMarkdown: 'rendered body text' })
  })

  it('falls back to the raw render when AI extraction returns null', async () => {
    renderUrl.mockResolvedValue({ title: 'Raw title', markdown: 'rendered body text' })
    isAiEnabled.mockReturnValue(true)
    extractJobFromContent.mockResolvedValue(null)
    const r = await renderAndExtract('<html/>', 'https://x/1')
    expect(r).toMatchObject({ source: 'render', snapshotMarkdown: 'rendered body text' })
  })
})
