import { describe, it, expect, vi, afterEach } from 'vitest'

// The real logger reads env + spins up a pino-pretty worker at module load — stub
// it. assertFetchableUrl does real DNS — stub it to a no-op (covered in url-guard.test.ts).
const { assertFetchableUrl } = vi.hoisted(() => ({ assertFetchableUrl: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/shared/logger.js', () => ({ logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('./url-guard.js', () => ({ assertFetchableUrl, isPrivateIp: () => false }))

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
  it('does not truncate when "Markdown Content:" appears inside the body text', () => {
    // No header envelope; the phrase appears mid-sentence and must NOT be treated as the marker.
    const r = parseJinaResponse('# Some job\n\nWe build a Markdown Content: pipeline. Apply now.')
    expect(r?.markdown).toContain('We build a Markdown Content: pipeline')
    expect(r?.markdown).toContain('# Some job')
  })
  it('returns null for empty input', () => {
    expect(parseJinaResponse('')).toBeNull()
    expect(parseJinaResponse('   ')).toBeNull()
  })
})

describe('createJinaRenderClient', () => {
  it('fetches r.jina.ai and returns the parsed result', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response('Title: Role\n\nMarkdown Content:\nDo the thing.', { status: 200 }))
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
    const fetchMock = vi.fn().mockResolvedValue(new Response('Markdown Content:\nContent.', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await createJinaRenderClient('secret-key').render('https://x/1')
    const headers = (fetchMock.mock.calls[0]?.[1] as { headers: Record<string, string> }).headers
    expect(headers['Authorization']).toBe('Bearer secret-key')
  })
  it('returns null on a non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 429 })))
    expect(await createJinaRenderClient().render('https://x/1')).toBeNull()
  })
  it('returns null when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    expect(await createJinaRenderClient().render('https://x/1')).toBeNull()
  })
  it('returns null when the SSRF guard rejects the target', async () => {
    assertFetchableUrl.mockRejectedValueOnce(new Error('private'))
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await createJinaRenderClient().render('https://x/1')).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
    assertFetchableUrl.mockResolvedValue(undefined)
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
