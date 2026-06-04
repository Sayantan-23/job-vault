import { describe, it, expect } from 'vitest'
import { parseFilters, isBoardFiltered, isListFiltered, buildListQuery, buildBoardQuery } from './filters'
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

describe('isBoardFiltered / isListFiltered', () => {
  it('board cares only about search + ghost', () => {
    expect(isBoardFiltered(DEFAULT_FILTERS)).toBe(false)
    expect(isBoardFiltered({ ...DEFAULT_FILTERS, status: 'APPLIED' })).toBe(false)        // status doesn't affect the board
    expect(isBoardFiltered({ ...DEFAULT_FILTERS, createdFrom: '2022-01-01' })).toBe(false) // nor does a date range
    expect(isBoardFiltered({ ...DEFAULT_FILTERS, search: 'x' })).toBe(true)
    expect(isBoardFiltered({ ...DEFAULT_FILTERS, ghost: 'ghost' })).toBe(true)
  })
  it('list counts every list filter', () => {
    expect(isListFiltered(DEFAULT_FILTERS)).toBe(false)
    expect(isListFiltered({ ...DEFAULT_FILTERS, status: 'APPLIED' })).toBe(true)
    expect(isListFiltered({ ...DEFAULT_FILTERS, createdFrom: '2022-01-01' })).toBe(true)
    expect(isListFiltered({ ...DEFAULT_FILTERS, createdTo: '2022-12-31' })).toBe(true)
    expect(isListFiltered({ ...DEFAULT_FILTERS, sortBy: 'title' })).toBe(false) // sort isn't a "filter"
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

describe('parseFilters date range', () => {
  it('reads from/to as createdFrom/createdTo when well-formed', () => {
    const f = parseFilters(new URLSearchParams('from=2022-01-01&to=2022-12-31'))
    expect(f.createdFrom).toBe('2022-01-01')
    expect(f.createdTo).toBe('2022-12-31')
  })
  it('ignores malformed dates', () => {
    const f = parseFilters(new URLSearchParams('from=nope&to=2022/12/31'))
    expect(f.createdFrom).toBeUndefined()
    expect(f.createdTo).toBeUndefined()
  })
})

describe('buildListQuery date range', () => {
  it('maps from/to to createdFrom/createdTo', () => {
    const p = new URLSearchParams(buildListQuery({ ...DEFAULT_FILTERS, createdFrom: '2022-01-01', createdTo: '2022-12-31' }).replace(/^\?/, ''))
    expect(p.get('createdFrom')).toBe('2022-01-01')
    expect(p.get('createdTo')).toBe('2022-12-31')
  })
})

describe('buildBoardQuery ignores date range', () => {
  it('never emits createdFrom/createdTo', () => {
    const qs = buildBoardQuery({ search: 'x', ghost: 'all' })
    expect(qs).not.toMatch(/created/i)
  })
})
