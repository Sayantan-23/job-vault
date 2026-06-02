import { cookies } from 'next/headers'
import { ApiError } from './api-client'

// Server Components run inside the Next server process and reach the backend
// directly (not through the browser-facing rewrite), so they use the server-only
// internal URL (e.g. http://backend-express:3000 in Docker).
const API_BASE =
  process.env['BACKEND_INTERNAL_URL'] ?? process.env['NEXT_PUBLIC_API_BASE'] ?? 'http://localhost:3000'

interface SuccessEnvelope<T> {
  data: T
  meta?: unknown
}

interface ErrorEnvelope {
  statusCode: number
  message: string
  error: string
  details?: unknown
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  }
  if (cookieHeader) headers['Cookie'] = cookieHeader
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const fetchInit: RequestInit = {
    method,
    headers,
    cache: 'no-store',
    ...init,
  }
  if (body !== undefined) fetchInit.body = JSON.stringify(body)

  const res = await fetch(url, fetchInit)

  const isJson = res.headers.get('content-type')?.includes('application/json') ?? false
  const payload = isJson ? ((await res.json()) as unknown) : null

  if (!res.ok) {
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const err = payload as ErrorEnvelope
      throw new ApiError(err.statusCode ?? res.status, err.message, err.error ?? 'UNKNOWN', err.details)
    }
    throw new ApiError(res.status, res.statusText || 'Request failed', 'UNKNOWN')
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as SuccessEnvelope<T>).data
  }
  return payload as T
}

export const apiServer = {
  get: <T>(path: string, init?: RequestInit) => request<T>('GET', path, undefined, init),
  post: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>('POST', path, body, init),
}
