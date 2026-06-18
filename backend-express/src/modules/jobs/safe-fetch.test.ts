import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Validate the redirect-following + per-hop guard logic. The connect-time IP
// validator (validatingLookup) needs a real socket, so it's covered by the
// classifier tests in url-guard.test.ts plus a live smoke; here we drive the
// hop logic with a mocked global fetch + a spyable guard.
const { assertFetchableUrl } = vi.hoisted(() => ({ assertFetchableUrl: vi.fn() }))
vi.mock('./url-guard.js', () => ({ assertFetchableUrl, isPrivateIp: () => false }))

import { safeFetch } from './safe-fetch.js'

const redirect = (location: string) => new Response(null, { status: 302, headers: { location } })

beforeEach(() => {
  assertFetchableUrl.mockReset().mockResolvedValue(undefined)
})
afterEach(() => vi.unstubAllGlobals())

describe('safeFetch', () => {
  it('follows a redirect and re-validates every hop', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirect('https://cdn.example.com/job'))
      .mockResolvedValueOnce(new Response('ok body', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await safeFetch('https://example.com/job')
    expect(res.status).toBe(200)
    expect(assertFetchableUrl).toHaveBeenCalledTimes(2)
    expect(assertFetchableUrl).toHaveBeenNthCalledWith(1, 'https://example.com/job')
    expect(assertFetchableUrl).toHaveBeenNthCalledWith(2, 'https://cdn.example.com/job')
  })

  it('resolves a relative redirect Location against the current URL', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirect('/elsewhere'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await safeFetch('https://example.com/a/b')
    expect(assertFetchableUrl).toHaveBeenNthCalledWith(2, 'https://example.com/elsewhere')
  })

  it('rejects when a redirect hop points at a blocked address', async () => {
    assertFetchableUrl
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Refusing to scrape a private or local address'))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(redirect('http://169.254.169.254/latest/')))
    await expect(safeFetch('https://example.com/job')).rejects.toThrow(/private or local/)
  })

  it('throws after too many redirects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(redirect('https://example.com/loop')))
    await expect(safeFetch('https://example.com/job')).rejects.toThrow(/too many redirects/i)
  })

  it('returns a redirect response that has no Location header as-is', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(null, { status: 302 })))
    const res = await safeFetch('https://example.com/job')
    expect(res.status).toBe(302)
  })
})
