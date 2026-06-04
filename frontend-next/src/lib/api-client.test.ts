import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient, ApiError } from './api-client'

const originalFetch = globalThis.fetch

function mockFetch(response: { status: number; body: unknown; ok?: boolean }) {
  globalThis.fetch = vi.fn(async () =>
    new Response(JSON.stringify(response.body), {
      status: response.status,
      headers: { 'content-type': 'application/json' },
    }),
  ) as unknown as typeof fetch
}

// A fetch mock whose response is computed per-call from the request URL, so a
// test can return a 401 first and a 200 on the retry, etc.
function sequencedFetch(handler: (url: string, init?: RequestInit) => { status: number; body: unknown }) {
  globalThis.fetch = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const { status, body } = handler(String(url), init)
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }) as unknown as typeof fetch
}

const UNAUTH = { statusCode: 401, message: 'expired', error: 'UNAUTHORIZED' }

describe('apiClient', () => {
  beforeEach(() => {
    process.env['NEXT_PUBLIC_API_BASE'] = 'http://localhost:3000'
  })
  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('GETs and unwraps the data envelope', async () => {
    mockFetch({ status: 200, body: { data: { ok: true } } })
    const result = await apiClient.get<{ ok: boolean }>('/api/health')
    expect(result).toEqual({ ok: true })
  })

  it('sends credentials and JSON content-type on POST', async () => {
    const fetchMock = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
        new Response(JSON.stringify({ data: { id: 1 } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch
    await apiClient.post('/api/echo', { name: 'x' })
    expect(fetchMock).toHaveBeenCalledOnce()
    const call = fetchMock.mock.calls[0]
    if (!call) throw new Error('fetch was not called')
    const init = call[1]
    if (!init) throw new Error('fetch was called without init')
    expect(init.credentials).toBe('include')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(init.body).toBe(JSON.stringify({ name: 'x' }))
  })

  it('throws ApiError with status, message, error, and details on failure', async () => {
    mockFetch({
      status: 400,
      body: {
        statusCode: 400,
        message: 'Validation failed',
        error: 'VALIDATION_ERROR',
        details: { fieldErrors: { email: ['required'] } },
      },
    })
    await expect(apiClient.get('/api/x')).rejects.toMatchObject({
      statusCode: 400,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
    })
  })

  it('throws ApiError on non-JSON 5xx', async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response('Internal Server Error', { status: 500 }),
    ) as unknown as typeof fetch
    await expect(apiClient.get('/api/x')).rejects.toBeInstanceOf(ApiError)
  })

  it('silently refreshes and retries once on a 401, then returns the data', async () => {
    let dataCalls = 0
    let refreshCalls = 0
    sequencedFetch((url) => {
      if (url.includes('/api/auth/refresh')) {
        refreshCalls++
        return { status: 200, body: { data: { id: 'u1' } } }
      }
      dataCalls++
      return dataCalls === 1
        ? { status: 401, body: UNAUTH }
        : { status: 200, body: { data: { ok: true } } }
    })
    const result = await apiClient.get<{ ok: boolean }>('/api/jobs')
    expect(result).toEqual({ ok: true })
    expect(refreshCalls).toBe(1)
    expect(dataCalls).toBe(2)
  })

  it('de-duplicates concurrent refreshes (single-flight)', async () => {
    let refreshCalls = 0
    const dataCalls = new Map<string, number>()
    sequencedFetch((url) => {
      if (url.includes('/api/auth/refresh')) {
        refreshCalls++
        return { status: 200, body: { data: { id: 'u1' } } }
      }
      const n = (dataCalls.get(url) ?? 0) + 1
      dataCalls.set(url, n)
      return n === 1 ? { status: 401, body: UNAUTH } : { status: 200, body: { data: { path: url } } }
    })
    const [a, b] = await Promise.all([
      apiClient.get<{ path: string }>('/api/jobs'),
      apiClient.get<{ path: string }>('/api/notifications'),
    ])
    expect(refreshCalls).toBe(1)
    expect(a.path).toContain('/api/jobs')
    expect(b.path).toContain('/api/notifications')
  })

  it('attempts exactly one refresh, then throws, when the refresh also fails', async () => {
    let refreshCalls = 0
    sequencedFetch((url) => {
      if (url.includes('/api/auth/refresh')) {
        refreshCalls++
        return { status: 401, body: UNAUTH } // refresh itself fails → unrecoverable
      }
      return { status: 401, body: UNAUTH }
    })
    // The unrecoverable path also calls window.location.assign('/login'); jsdom
    // logs a benign "navigation not implemented" notice but does not throw.
    await expect(apiClient.get('/api/jobs')).rejects.toBeInstanceOf(ApiError)
    expect(refreshCalls).toBe(1)
  })

  it('does NOT refresh on a 401 from the login endpoint', async () => {
    let refreshCalls = 0
    sequencedFetch((url) => {
      if (url.includes('/api/auth/refresh')) {
        refreshCalls++
        return { status: 200, body: { data: {} } }
      }
      return { status: 401, body: { statusCode: 401, message: 'bad creds', error: 'UNAUTHORIZED' } }
    })
    await expect(apiClient.post('/api/auth/login', { email: 'a', password: 'b' })).rejects.toBeInstanceOf(
      ApiError,
    )
    expect(refreshCalls).toBe(0)
  })

  it('getPage returns the full {data, meta} envelope without unwrapping', async () => {
    mockFetch({ status: 200, body: { data: [{ id: 'j1' }], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } } })
    const page = await apiClient.getPage<{ id: string }>('/api/jobs')
    expect(page.data[0]?.id).toBe('j1')
    expect(page.meta).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 })
  })
})
