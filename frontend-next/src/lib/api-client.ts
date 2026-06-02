// The browser always calls the Next server same-origin (`/api/*`); next.config
// rewrites proxy that to the backend. So there is no absolute base in the browser
// (a Docker-internal hostname would be unreachable from the user's machine).
const API_BASE = ''

export class ApiError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: unknown

  constructor(statusCode: number, message: string, code: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    if (details !== undefined) this.details = details
  }
}

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
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const fetchInit: RequestInit = {
    method,
    credentials: 'include',
    headers,
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

export const apiClient = {
  get: <T>(path: string, init?: RequestInit) => request<T>('GET', path, undefined, init),
  post: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>('POST', path, body, init),
  patch: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>('PATCH', path, body, init),
  put: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>('PUT', path, body, init),
  delete: <T>(path: string, init?: RequestInit) => request<T>('DELETE', path, undefined, init),
}
