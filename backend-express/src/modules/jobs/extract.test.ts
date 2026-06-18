import { describe, it, expect, vi, beforeEach } from 'vitest'

const { generateStructured } = vi.hoisted(() => ({ generateStructured: vi.fn() }))
vi.mock('@/modules/ai/gemini.service.js', () => ({
  geminiService: { generateStructured, isAiEnabled: () => true },
}))

import { extractJobFromContent } from './extract.js'

beforeEach(() => generateStructured.mockReset())

describe('extractJobFromContent', () => {
  it('maps the AI output to a partial scrape, dropping empty fields', async () => {
    generateStructured.mockResolvedValue({
      title: 'Quality Analyst',
      company: 'Teleperformance',
      location: 'Kolkata',
      salaryRange: '',
      descriptionMarkdown: '# Role\n\nDo QA.',
    })
    const r = await extractJobFromContent('rendered content', 'https://x/1')
    expect(r).toEqual({
      title: 'Quality Analyst',
      company: 'Teleperformance',
      location: 'Kolkata',
      snapshotMarkdown: '# Role\n\nDo QA.',
    })
    expect(r).not.toHaveProperty('salaryRange')
  })

  it('returns null without calling the model for empty content', async () => {
    expect(await extractJobFromContent('   ', 'https://x/1')).toBeNull()
    expect(generateStructured).not.toHaveBeenCalled()
  })

  it('returns null when the model finds nothing usable', async () => {
    generateStructured.mockResolvedValue({
      title: '',
      company: '',
      location: '',
      salaryRange: '',
      descriptionMarkdown: '',
    })
    expect(await extractJobFromContent('rendered', 'https://x/1')).toBeNull()
  })
})
