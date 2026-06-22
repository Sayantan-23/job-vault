export interface JobSummary {
  id: string
  title: string
  company: string
  status: string
}
export interface QuickCreateResult extends JobSummary {
  isDuplicate: boolean
}
export interface VerifyResult {
  ok: true
  user: { email: string }
}
export interface ScrapeResult {
  title: string
  company: string
  location?: string
  salaryRange?: string
  snapshotMarkdown: string
  status: 'ok' | 'partial' | 'empty'
  source: string
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function call<T>(serverUrl: string, token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${serverUrl}${path}`, {
    method: init?.method ?? 'GET',
    body: init?.body,
    headers: { 'X-API-Key': token, 'Content-Type': 'application/json', Accept: 'application/json' },
  })
  const isJson = res.headers.get('content-type')?.includes('application/json') ?? false
  const payload: unknown = isJson ? await res.json() : null
  if (!res.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : `Request failed (${res.status})`
    throw new ApiError(res.status, message)
  }
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

export function verifyKey(serverUrl: string, token: string): Promise<VerifyResult> {
  return call<VerifyResult>(serverUrl, token, '/api/extension/verify-key', { method: 'POST' })
}

export function checkUrl(
  serverUrl: string,
  token: string,
  url: string,
): Promise<{ isDuplicate: boolean; job?: JobSummary }> {
  return call(serverUrl, token, `/api/extension/check-url?url=${encodeURIComponent(url)}`)
}

// Backend scrape fallback for pages the content script can't parse (generic sites).
export function scrape(serverUrl: string, token: string, sourceUrl: string): Promise<ScrapeResult> {
  return call<ScrapeResult>(serverUrl, token, '/api/extension/scrape', {
    method: 'POST',
    body: JSON.stringify({ sourceUrl }),
  })
}

export interface QuickCreateInput {
  title: string
  company: string
  location?: string
  salaryRange?: string
  description?: string
  sourceUrl?: string
}

export function quickCreate(serverUrl: string, token: string, job: QuickCreateInput): Promise<QuickCreateResult> {
  return call<QuickCreateResult>(serverUrl, token, '/api/extension/jobs', {
    method: 'POST',
    body: JSON.stringify({
      title: job.title,
      company: job.company,
      location: job.location,
      salaryRange: job.salaryRange,
      sourceUrl: job.sourceUrl,
      description: job.description,
    }),
  })
}
