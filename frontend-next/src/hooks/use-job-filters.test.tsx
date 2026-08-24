import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const { replaceUrl, searchParams } = vi.hoisted(() => ({
  replaceUrl: vi.fn(),
  searchParams: new URLSearchParams(),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/app/jobs',
  useSearchParams: () => searchParams,
}))
// Filters update the URL through history.replaceState, not the router — the
// data behind them is React Query's, so the server page must not re-run.
vi.mock('@/lib/url-state', () => ({ replaceUrl }))

import { useJobFilters } from './use-job-filters'

beforeEach(() => {
  vi.clearAllMocks()
  for (const k of ['search', 'status', 'ghost', 'sort', 'dir', 'page', 'from', 'to', 'view', 'job']) searchParams.delete(k)
})

function lastUrl(): string {
  const calls = replaceUrl.mock.calls
  return String(calls[calls.length - 1]?.[0] ?? '')
}

describe('useJobFilters', () => {
  it('parses defaults and reports not-filtered', () => {
    const { result } = renderHook(() => useJobFilters())
    expect(result.current.filters.sortBy).toBe('createdAt')
    expect(result.current.isBoardFiltered).toBe(false)
    expect(result.current.isListFiltered).toBe(false)
  })

  it('setSearch writes search through history, not the router', () => {
    const { result } = renderHook(() => useJobFilters())
    act(() => result.current.setSearch('rust'))
    expect(lastUrl()).toBe('/app/jobs?search=rust')
    expect(replaceUrl).toHaveBeenLastCalledWith('/app/jobs?search=rust')
  })

  it('setSearch with blank clears the param', () => {
    searchParams.set('search', 'old')
    const { result } = renderHook(() => useJobFilters())
    act(() => result.current.setSearch('   '))
    expect(lastUrl()).toBe('/app/jobs')
  })

  it('preserves view and job params', () => {
    searchParams.set('view', 'board')
    searchParams.set('job', 'j1')
    const { result } = renderHook(() => useJobFilters())
    act(() => result.current.setGhost('ghost'))
    const url = new URL(lastUrl(), 'http://x')
    expect(url.searchParams.get('view')).toBe('board')
    expect(url.searchParams.get('job')).toBe('j1')
    expect(url.searchParams.get('ghost')).toBe('ghost')
  })

  it('changing a filter resets page to 1 (drops the page param)', () => {
    searchParams.set('page', '4')
    const { result } = renderHook(() => useJobFilters())
    act(() => result.current.setStatus('APPLIED'))
    const url = new URL(lastUrl(), 'http://x')
    expect(url.searchParams.has('page')).toBe(false)
    expect(url.searchParams.get('status')).toBe('APPLIED')
  })

  it('setPage sets page but does NOT reset it', () => {
    const { result } = renderHook(() => useJobFilters())
    act(() => result.current.setPage(3))
    expect(new URL(lastUrl(), 'http://x').searchParams.get('page')).toBe('3')
    act(() => result.current.setPage(1))
    expect(new URL(lastUrl(), 'http://x').searchParams.has('page')).toBe(false) // page 1 is the default
  })

  it('cycleSort: a non-default column goes inactive -> asc -> desc -> off(default)', () => {
    const { result, rerender } = renderHook(() => useJobFilters())
    act(() => result.current.cycleSort('company'))
    expect(new URL(lastUrl(), 'http://x').searchParams.get('sort')).toBe('company')
    expect(new URL(lastUrl(), 'http://x').searchParams.get('dir')).toBe('asc')

    searchParams.set('sort', 'company'); searchParams.set('dir', 'asc'); rerender()
    act(() => result.current.cycleSort('company'))
    expect(new URL(lastUrl(), 'http://x').searchParams.get('sort')).toBe('company')
    expect(new URL(lastUrl(), 'http://x').searchParams.has('dir')).toBe(false) // desc (omitted)

    searchParams.delete('dir'); rerender() // now sort=company, desc
    act(() => result.current.cycleSort('company'))
    const off = new URL(lastUrl(), 'http://x').searchParams
    expect(off.has('sort')).toBe(false) // off -> default createdAt desc
    expect(off.has('dir')).toBe(false)
  })

  it('cycleSort: the Added (createdAt) column toggles asc<->desc', () => {
    const { result, rerender } = renderHook(() => useJobFilters())
    act(() => result.current.cycleSort('createdAt')) // default desc -> asc
    expect(new URL(lastUrl(), 'http://x').searchParams.get('sort')).toBe('createdAt')
    expect(new URL(lastUrl(), 'http://x').searchParams.get('dir')).toBe('asc')

    searchParams.set('sort', 'createdAt'); searchParams.set('dir', 'asc'); rerender()
    act(() => result.current.cycleSort('createdAt')) // asc -> default desc (cleared)
    const back = new URL(lastUrl(), 'http://x').searchParams
    expect(back.has('sort')).toBe(false)
    expect(back.has('dir')).toBe(false)
  })

  it('cycleSort: switching into Added from another active sort goes to asc', () => {
    searchParams.set('sort', 'company'); searchParams.set('dir', 'asc')
    const { result } = renderHook(() => useJobFilters())
    act(() => result.current.cycleSort('createdAt'))
    const u = new URL(lastUrl(), 'http://x').searchParams
    expect(u.get('sort')).toBe('createdAt')
    expect(u.get('dir')).toBe('asc')
  })

  it('setDateRange sets/clears from+to, resets page, preserves view', () => {
    searchParams.set('page', '3'); searchParams.set('view', 'board')
    const { result } = renderHook(() => useJobFilters())
    act(() => result.current.setDateRange('2022-01-01', '2022-12-31'))
    let u = new URL(lastUrl(), 'http://x')
    expect(u.searchParams.get('from')).toBe('2022-01-01')
    expect(u.searchParams.get('to')).toBe('2022-12-31')
    expect(u.searchParams.has('page')).toBe(false)
    expect(u.searchParams.get('view')).toBe('board')
    act(() => result.current.setDateRange(undefined, undefined))
    u = new URL(lastUrl(), 'http://x')
    expect(u.searchParams.has('from')).toBe(false)
    expect(u.searchParams.has('to')).toBe(false)
  })

  it('applyFilters commits status + from + to in a single navigation', () => {
    searchParams.set('page', '3'); searchParams.set('view', 'board')
    const { result } = renderHook(() => useJobFilters())
    act(() => result.current.applyFilters({ status: 'APPLIED', from: '2022-01-01', to: '2022-12-31' }))
    expect(replaceUrl).toHaveBeenCalledTimes(1) // one URL update, not one per facet
    const u = new URL(lastUrl(), 'http://x')
    expect(u.searchParams.get('status')).toBe('APPLIED')
    expect(u.searchParams.get('from')).toBe('2022-01-01')
    expect(u.searchParams.get('to')).toBe('2022-12-31')
    expect(u.searchParams.has('page')).toBe(false) // filter change resets page
    expect(u.searchParams.get('view')).toBe('board')
  })

  it('applyFilters with an empty object clears status + from + to', () => {
    searchParams.set('status', 'APPLIED'); searchParams.set('from', '2022-01-01'); searchParams.set('to', '2022-12-31')
    const { result } = renderHook(() => useJobFilters())
    act(() => result.current.applyFilters({}))
    const u = new URL(lastUrl(), 'http://x')
    expect(u.searchParams.has('status')).toBe(false)
    expect(u.searchParams.has('from')).toBe(false)
    expect(u.searchParams.has('to')).toBe(false)
  })

  it('resetAll clears filter params but keeps view/job', () => {
    searchParams.set('search', 'x')
    searchParams.set('status', 'APPLIED')
    searchParams.set('from', '2022-01-01')
    searchParams.set('view', 'board')
    const { result } = renderHook(() => useJobFilters())
    act(() => result.current.resetAll())
    const url = new URL(lastUrl(), 'http://x')
    expect(url.searchParams.has('search')).toBe(false)
    expect(url.searchParams.has('status')).toBe(false)
    expect(url.searchParams.has('from')).toBe(false)
    expect(url.searchParams.get('view')).toBe('board')
  })
})
