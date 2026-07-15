import type { Paginated } from '@/types/filters'

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

// --- Silent session refresh -------------------------------------------------
// When a request 401s because the 15-minute access token expired, transparently
// hit the refresh endpoint (which rotates the 7-day refresh token) and retry the
// original request once. A single shared in-flight promise de-duplicates
// concurrent refreshes so token rotation never races — two refreshes with the
// same token would trip the backend's reuse-detection and log the user out.
let refreshInFlight: Promise<boolean> | null = null

function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

// The auth endpoints themselves must not trigger a refresh: their 401s mean
// "bad or absent credentials", not "expired access token".
function isRefreshable(path: string): boolean {
  return !/\/api\/auth\/(refresh|login|register)(?:$|[/?])/.test(path)
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  init?: RequestInit,
  isRetry = false,
  unwrap = true,
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  }
  // A FormData body passes through untouched: the browser sets the multipart
  // Content-Type (with its boundary) itself — a manual JSON header would
  // corrupt the body.
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json'

  const fetchInit: RequestInit = {
    method,
    credentials: 'include',
    headers,
    ...init,
  }
  if (body !== undefined) fetchInit.body = isForm ? (body as FormData) : JSON.stringify(body)

  const res = await fetch(url, fetchInit)

  if (res.status === 401 && !isRetry && isRefreshable(path)) {
    const refreshed = await refreshSession()
    if (refreshed) return request<T>(method, path, body, init, true, unwrap)
    // The refresh token is gone/invalid — the session is unrecoverable. Carry
    // the current URL in ?next= so login can return the user here afterwards.
    if (typeof window !== 'undefined') {
      const next = window.location.pathname + window.location.search
      window.location.assign(`/login?next=${encodeURIComponent(next)}`)
    }
  }

  const isJson = res.headers.get('content-type')?.includes('application/json') ?? false
  const payload = isJson ? ((await res.json()) as unknown) : null

  if (!res.ok) {
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const err = payload as ErrorEnvelope
      throw new ApiError(err.statusCode ?? res.status, err.message, err.error ?? 'UNKNOWN', err.details)
    }
    throw new ApiError(res.status, res.statusText || 'Request failed', 'UNKNOWN')
  }

  if (unwrap && payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as SuccessEnvelope<T>).data
  }
  return payload as T
}

export const apiClient = {
  get: <T>(path: string, init?: RequestInit) => request<T>('GET', path, undefined, init),
  getPage: <T>(path: string, init?: RequestInit) =>
    request<Paginated<T>>('GET', path, undefined, init, false, false),
  post: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>('POST', path, body, init),
  postForm: <T>(path: string, form: FormData, init?: RequestInit) => request<T>('POST', path, form, init),
  patch: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>('PATCH', path, body, init),
  put: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>('PUT', path, body, init),
  delete: <T>(path: string, init?: RequestInit) => request<T>('DELETE', path, undefined, init),
}
