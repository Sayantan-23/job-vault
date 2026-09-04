import { DEFAULT_FILTERS, type JobFilters } from '@/types/filters'

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
  if (f.limit !== undefined) p.set('limit', String(f.limit))
  if (f.createdFrom) p.set('createdFrom', f.createdFrom)
  if (f.createdTo) p.set('createdTo', f.createdTo)
  const qs = p.toString()
  return qs ? `?${qs}` : ''
}
