import { describe, it, expect } from 'vitest'
import { parseFilters, isFiltered, buildListQuery, buildBoardQuery } from './filters'
import { DEFAULT_FILTERS } from '@/types/filters'

describe('parseFilters', () => {
  it('returns defaults for empty params', () => {
    expect(parseFilters(new URLSearchParams())).toEqual(DEFAULT_FILTERS)
  })

  it('reads URL param names and coerces page', () => {
    const f = parseFilters(new URLSearchParams('search=rust&status=APPLIED&ghost=stale&sort=company&dir=asc&page=3'))
    expect(f).toEqual({ search: 'rust', status: 'APPLIED', ghost: 'stale', sortBy: 'company', sortOrder: 'asc', page: 3 })
  })

  it('falls back to defaults for invalid enum/page values', () => {
    const f = parseFilters(new URLSearchParams('status=NOPE&ghost=weird&sort=bogus&dir=sideways&page=0'))
    expect(f.status).toBeUndefined()
    expect(f.ghost).toBe('all')
    expect(f.sortBy).toBe('createdAt')
    expect(f.sortOrder).toBe('desc')
    expect(f.page).toBe(1)
  })

  it('trims search', () => {
    expect(parseFilters(new URLSearchParams('search=%20%20hi%20%20')).search).toBe('hi')
  })
})

describe('isFiltered', () => {
  it('is false for defaults and true for any narrowing filter', () => {
    expect(isFiltered(DEFAULT_FILTERS)).toBe(false)
    expect(isFiltered({ ...DEFAULT_FILTERS, search: 'x' })).toBe(true)
    expect(isFiltered({ ...DEFAULT_FILTERS, status: 'APPLIED' })).toBe(true)
    expect(isFiltered({ ...DEFAULT_FILTERS, ghost: 'ghost' })).toBe(true)
  })

  it('ignores sort/page (they are not narrowing filters)', () => {
    expect(isFiltered({ ...DEFAULT_FILTERS, sortBy: 'title', sortOrder: 'asc', page: 4 })).toBe(false)
  })
})

describe('buildListQuery', () => {
  it('is empty for defaults', () => {
    expect(buildListQuery(DEFAULT_FILTERS)).toBe('')
  })

  it('maps URL state to API param names, omitting defaults', () => {
    const qs = buildListQuery({ search: 'rust', status: 'APPLIED', ghost: 'stale', sortBy: 'company', sortOrder: 'asc', page: 2 })
    const p = new URLSearchParams(qs.replace(/^\?/, ''))
    expect(p.get('search')).toBe('rust')
    expect(p.get('status')).toBe('APPLIED')
    expect(p.get('ghostFilter')).toBe('stale')
    expect(p.get('sortBy')).toBe('company')
    expect(p.get('sortOrder')).toBe('asc')
    expect(p.get('page')).toBe('2')
  })
})

describe('buildBoardQuery', () => {
  it('includes only search + ghostFilter, omitting defaults', () => {
    expect(buildBoardQuery({ search: '', ghost: 'all' })).toBe('')
    const qs = buildBoardQuery({ search: 'acme', ghost: 'active' })
    const p = new URLSearchParams(qs.replace(/^\?/, ''))
    expect(p.get('search')).toBe('acme')
    expect(p.get('ghostFilter')).toBe('active')
    expect(p.has('status')).toBe(false)
    expect(p.has('sortBy')).toBe(false)
  })
})
