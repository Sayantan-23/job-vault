import { describe, it, expect, vi, afterEach } from 'vitest'

// The real logger reads env + spins up a pino-pretty worker at module load — stub
// it so the unit stays hermetic (render.ts imports it).
vi.mock('@/shared/logger.js', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import { parseJinaResponse, createJinaRenderClient, renderUrl, type RenderClient } from './render.js'

afterEach(() => vi.unstubAllGlobals())

describe('parseJinaResponse', () => {
  it('splits the Title header from the Markdown body', () => {
    const r = parseJinaResponse(
      'Title: Quality Analyst - Kolkata\n\nURL Source: https://x\n\nMarkdown Content:\n# Quality Analyst\n\nResponsibilities…',
    )
    expect(r?.title).toBe('Quality Analyst - Kolkata')
    expect(r?.markdown).toContain('# Quality Analyst')
    expect(r?.markdown).not.toContain('URL Source')
  })
  it('treats the whole payload as body when the headers are absent', () => {
    const r = parseJinaResponse('Just some rendered markdown.')
    expect(r?.markdown).toBe('Just some rendered markdown.')
    expect(r?.title).toBeUndefined()
  })
  it('returns null for empty input', () => {
    expect(parseJinaResponse('')).toBeNull()
    expect(parseJinaResponse('   ')).toBeNull()
  })
})

describe('createJinaRenderClient', () => {
  it('fetches r.jina.ai and returns the parsed result', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('Title: Role\n\nMarkdown Content:\nDo the thing.'),
    })
    vi.stubGlobal('fetch', fetchMock)
    const client = createJinaRenderClient()
    const r = await client.render('https://jobs.example.com/1')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://r.jina.ai/https://jobs.example.com/1',
      expect.objectContaining({ headers: expect.objectContaining({ 'X-Return-Format': 'markdown' }) }),
    )
    expect(r?.title).toBe('Role')
    expect(r?.markdown).toBe('Do the thing.')
  })
  it('sends a bearer token when an API key is configured', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('Markdown Content:\nContent.'),
    })
    vi.stubGlobal('fetch', fetchMock)
    await createJinaRenderClient('secret-key').render('https://x/1')
    const headers = fetchMock.mock.calls[0][1].headers
    expect(headers['Authorization']).toBe('Bearer secret-key')
  })
  it('returns null on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429, text: () => Promise.resolve('') }))
    expect(await createJinaRenderClient().render('https://x/1')).toBeNull()
  })
  it('returns null when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    expect(await createJinaRenderClient().render('https://x/1')).toBeNull()
  })
})

describe('renderUrl', () => {
  const ok = (markdown: string): RenderClient => ({ name: 'ok', render: () => Promise.resolve({ markdown }) })
  const empty: RenderClient = { name: 'empty', render: () => Promise.resolve(null) }
  const boom: RenderClient = { name: 'boom', render: () => Promise.reject(new Error('boom')) }

  it('returns the first non-empty render', async () => {
    const r = await renderUrl('https://x/1', [empty, ok('real content')])
    expect(r?.markdown).toBe('real content')
  })
  it('skips a throwing provider and continues', async () => {
    const r = await renderUrl('https://x/1', [boom, ok('recovered')])
    expect(r?.markdown).toBe('recovered')
  })
  it('returns null when every provider yields nothing', async () => {
    expect(await renderUrl('https://x/1', [empty, boom])).toBeNull()
  })
})
