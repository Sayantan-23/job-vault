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

describe('apiClient', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE = 'http://localhost:3000'
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
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ data: { id: 1 } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )
    globalThis.fetch = fetchMock as unknown as typeof fetch
    await apiClient.post('/api/echo', { name: 'x' })
    const call = fetchMock.mock.calls[0]
    expect(call).toBeDefined()
    const init = call![1] as RequestInit
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
})
