import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const { replace, searchParams } = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/app/jobs',
  useSearchParams: () => searchParams,
}))

import { useJobFilters } from './use-job-filters'

beforeEach(() => {
  vi.clearAllMocks()
  for (const k of ['search', 'status', 'ghost', 'sort', 'dir', 'page', 'view', 'job']) searchParams.delete(k)
})

function lastUrl(): string {
  const calls = replace.mock.calls
  return String(calls[calls.length - 1]?.[0] ?? '')
}

describe('useJobFilters', () => {
  it('parses defaults and reports not-filtered', () => {
    const { result } = renderHook(() => useJobFilters())
    expect(result.current.filters.sortBy).toBe('createdAt')
    expect(result.current.isFiltered).toBe(false)
  })

  it('setSearch writes search and emits scroll:false', () => {
    const { result } = renderHook(() => useJobFilters())
    act(() => result.current.setSearch('rust'))
    expect(lastUrl()).toBe('/app/jobs?search=rust')
    expect(replace).toHaveBeenLastCalledWith('/app/jobs?search=rust', { scroll: false })
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

  it('setSort sets a new field (default dir) and toggles dir on the active field', () => {
    const { result, rerender } = renderHook(() => useJobFilters())
    act(() => result.current.setSort('company'))
    expect(new URL(lastUrl(), 'http://x').searchParams.get('sort')).toBe('company')
    expect(new URL(lastUrl(), 'http://x').searchParams.has('dir')).toBe(false) // desc default → omitted
    // Simulate the URL now reflecting sort=company, then re-click the same field.
    searchParams.set('sort', 'company')
    rerender()
    act(() => result.current.setSort('company'))
    expect(new URL(lastUrl(), 'http://x').searchParams.get('dir')).toBe('asc')
  })

  it('resetAll clears filter params but keeps view/job', () => {
    searchParams.set('search', 'x')
    searchParams.set('status', 'APPLIED')
    searchParams.set('view', 'board')
    const { result } = renderHook(() => useJobFilters())
    act(() => result.current.resetAll())
    const url = new URL(lastUrl(), 'http://x')
    expect(url.searchParams.has('search')).toBe(false)
    expect(url.searchParams.has('status')).toBe(false)
    expect(url.searchParams.get('view')).toBe('board')
  })
})
