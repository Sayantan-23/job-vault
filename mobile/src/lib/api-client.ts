import { API_BASE } from './api-base';
import { authStore } from './auth-store';
import { setSession } from './session';
import type { Paginated } from '@/types/filters';

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    if (details !== undefined) this.details = details;
  }
}

interface SuccessEnvelope<T> {
  data: T;
  meta?: unknown;
}

interface ErrorEnvelope {
  statusCode: number;
  message: string;
  error: string;
  details?: unknown;
}

// --- Silent session refresh -------------------------------------------------
// Ported from frontend-next/src/lib/api-client.ts. The single-flight promise is
// the part that matters and it ports unchanged: two concurrent refreshes with
// the same token would race the backend's rotation and trip reuse-detection.
// What differs is only the transport — no cookie jar, so the refresh token goes
// out in the body and the new pair comes back in the body (d-0cc1x6).
let refreshInFlight: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  const refreshToken = await authStore.getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) return false;

  const payload = (await res.json()) as SuccessEnvelope<{
    accessToken?: string;
    refreshToken?: string;
  }>;
  const accessToken = payload.data?.accessToken;
  if (!accessToken) return false;

  // `payload.data.refreshToken` is absent when this refresh landed in another
  // request's 15s grace window (d-0cdcga). That is a success: authStore.save
  // keeps the stored token rather than clearing it.
  await authStore.save({ accessToken, refreshToken: payload.data.refreshToken });
  return true;
}

function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh()
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

// The auth endpoints themselves must not trigger a refresh: their 401s mean
// "bad or absent credentials", not "expired access token".
function isRefreshable(path: string): boolean {
  return !/\/api\/auth\/(refresh|login|register)(?:$|[/?])/.test(path);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  init?: RequestInit,
  isRetry = false,
  unwrap = true
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const accessToken = await authStore.getAccessToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };
  // A FormData body passes through untouched so fetch can set the multipart
  // Content-Type with its boundary; a manual JSON header would corrupt it.
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';

  const fetchInit: RequestInit = { method, headers, ...init };
  if (body !== undefined) fetchInit.body = isForm ? (body as FormData) : JSON.stringify(body);

  const res = await fetch(url, fetchInit);

  if (res.status === 401 && !isRetry && isRefreshable(path)) {
    const refreshed = await refreshSession();
    if (refreshed) return request<T>(method, path, body, init, true, unwrap);
    // The refresh token is gone or revoked: the session is unrecoverable. Drop
    // the keychain entries so nothing stale is replayed and mark the session
    // signed out — the root layout's route guard reacts to that, since there is
    // no window.location to navigate here (the web client's third difference).
    // The 401 still throws, so the caller also sees the failure.
    await authStore.clear();
    setSession({ status: 'signedOut' });
  }

  const isJson = res.headers.get('content-type')?.includes('application/json') ?? false;
  const payload = isJson ? ((await res.json()) as unknown) : null;

  if (!res.ok) {
    if (payload && typeof payload === 'object' && 'message' in payload) {
      const err = payload as ErrorEnvelope;
      throw new ApiError(
        err.statusCode ?? res.status,
        err.message,
        err.error ?? 'UNKNOWN',
        err.details
      );
    }
    throw new ApiError(res.status, res.statusText || 'Request failed', 'UNKNOWN');
  }

  if (unwrap && payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as SuccessEnvelope<T>).data;
  }
  return payload as T;
}

export const apiClient = {
  get: <T>(path: string, init?: RequestInit) => request<T>('GET', path, undefined, init),
  /** Whole-envelope GET, for the `{ data, meta }` pagination shape. */
  getPage: <T>(path: string, init?: RequestInit) =>
    request<Paginated<T>>('GET', path, undefined, init, false, false),
  post: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>('POST', path, body, init),
  postForm: <T>(path: string, form: FormData, init?: RequestInit) =>
    request<T>('POST', path, form, init),
  patch: <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>('PATCH', path, body, init),
  put: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>('PUT', path, body, init),
  delete: <T>(path: string, init?: RequestInit) => request<T>('DELETE', path, undefined, init),
};
