import { JOB_STATUSES, type JobStatus } from '@/lib/job-status'
import { DEFAULT_FILTERS, type GhostFilter, type JobFilters, type SortField, type SortOrder } from '@/types/filters'

const GHOST_VALUES: readonly string[] = ['all', 'active', 'stale', 'ghost']
const SORT_VALUES: readonly string[] = ['title', 'company', 'createdAt', 'updatedAt', 'lastActivityAt']

function asGhost(v: string | null): GhostFilter {
  return v && GHOST_VALUES.includes(v) ? (v as GhostFilter) : 'all'
}
function asSortField(v: string | null): SortField {
  return v && SORT_VALUES.includes(v) ? (v as SortField) : 'createdAt'
}
function asSortOrder(v: string | null): SortOrder {
  return v === 'asc' ? 'asc' : 'desc'
}
function asStatus(v: string | null): JobStatus | undefined {
  return v && (JOB_STATUSES as readonly string[]).includes(v) ? (v as JobStatus) : undefined
}
function asPage(v: string | null): number {
  const n = v ? Number.parseInt(v, 10) : 1
  return Number.isFinite(n) && n >= 1 ? n : 1
}
function asYmd(v: string | null): string | undefined {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined
}

// Reads filter state from URL query params, falling back to defaults. `params`
// is anything with `.get(name)` — URLSearchParams or Next's ReadonlyURLSearchParams.
export function parseFilters(params: { get(name: string): string | null }): JobFilters {
  const status = asStatus(params.get('status'))
  const createdFrom = asYmd(params.get('from'))
  const createdTo = asYmd(params.get('to'))
  return {
    search: params.get('search')?.trim() ?? '',
    ...(status ? { status } : {}),
    ...(createdFrom ? { createdFrom } : {}),
    ...(createdTo ? { createdTo } : {}),
    ghost: asGhost(params.get('ghost')),
    sortBy: asSortField(params.get('sort')),
    sortOrder: asSortOrder(params.get('dir')),
    page: asPage(params.get('page')),
  }
}

// Board reorder-suppression + board "matching" count: only filters the board endpoint honors.
export function isBoardFiltered(f: JobFilters): boolean {
  return f.search !== '' || f.ghost !== 'all'
}

// List reset / empty-state / "matching" count: every filter the list endpoint honors.
export function isListFiltered(f: JobFilters): boolean {
  return (
    f.search !== '' ||
    f.status !== undefined ||
    f.ghost !== 'all' ||
    f.createdFrom !== undefined ||
    f.createdTo !== undefined
  )
}

// Builds the `/api/jobs` query string (URL names → API names), defaults omitted.
export function buildListQuery(f: JobFilters): string {
  const p = new URLSearchParams()
  if (f.search) p.set('search', f.search)
  if (f.status) p.set('status', f.status)
  if (f.ghost !== DEFAULT_FILTERS.ghost) p.set('ghostFilter', f.ghost)
  if (f.sortBy !== DEFAULT_FILTERS.sortBy) p.set('sortBy', f.sortBy)
  if (f.sortOrder !== DEFAULT_FILTERS.sortOrder) p.set('sortOrder', f.sortOrder)
  if (f.page !== DEFAULT_FILTERS.page) p.set('page', String(f.page))
  if (f.createdFrom) p.set('createdFrom', f.createdFrom)
  if (f.createdTo) p.set('createdTo', f.createdTo)
  const qs = p.toString()
  return qs ? `?${qs}` : ''
}

// Builds the `/api/dashboard/kanban` query string (only search + ghostFilter).
export function buildBoardQuery(f: { search: string; ghost: GhostFilter }): string {
  const p = new URLSearchParams()
  if (f.search) p.set('search', f.search)
  if (f.ghost !== 'all') p.set('ghostFilter', f.ghost)
  const qs = p.toString()
  return qs ? `?${qs}` : ''
}
