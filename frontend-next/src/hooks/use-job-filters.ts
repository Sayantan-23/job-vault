'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { parseFilters, isBoardFiltered as computeBoardFiltered, isListFiltered as computeListFiltered } from '@/lib/filters'
import type { GhostFilter, JobFilters, SortField } from '@/types/filters'
import type { JobStatus } from '@/lib/job-status'

export interface UseJobFilters {
  filters: JobFilters
  isBoardFiltered: boolean
  isListFiltered: boolean
  setSearch: (value: string) => void
  setStatus: (value: JobStatus | undefined) => void
  setGhost: (value: GhostFilter) => void
  setDateRange: (from?: string, to?: string) => void
  /** Commit status + date-range together in a single URL update — used by the
   * staged filter menu so both facets apply at once (two separate setters would
   * race on the same searchParams snapshot and the later write would win). */
  applyFilters: (next: { status?: JobStatus | undefined; from?: string | undefined; to?: string | undefined }) => void
  /** Tap-to-sort 3-state cycle: asc -> desc -> off(default createdAt desc); createdAt toggles asc<->desc. */
  cycleSort: (field: SortField) => void
  setPage: (page: number) => void
  resetAll: () => void
}

const FILTER_KEYS = ['search', 'status', 'ghost', 'sort', 'dir', 'page', 'from', 'to'] as const

export function useJobFilters(): UseJobFilters {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const filters = parseFilters(searchParams)

  const commit = useCallback(
    (mutate: (p: URLSearchParams) => void, resetPage = true) => {
      const p = new URLSearchParams(searchParams.toString())
      mutate(p)
      if (resetPage) p.delete('page')
      const qs = p.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [router, pathname, searchParams],
  )

  const setSearch = useCallback(
    (value: string) => commit((p) => { const t = value.trim(); if (t) p.set('search', t); else p.delete('search') }),
    [commit],
  )
  const setStatus = useCallback(
    (value: JobStatus | undefined) => commit((p) => { if (value) p.set('status', value); else p.delete('status') }),
    [commit],
  )
  const setGhost = useCallback(
    (value: GhostFilter) => commit((p) => { if (value !== 'all') p.set('ghost', value); else p.delete('ghost') }),
    [commit],
  )
  const setDateRange = useCallback(
    (from?: string, to?: string) => commit((p) => {
      if (from) p.set('from', from); else p.delete('from')
      if (to) p.set('to', to); else p.delete('to')
    }),
    [commit],
  )
  const applyFilters = useCallback(
    (next: { status?: JobStatus | undefined; from?: string | undefined; to?: string | undefined }) =>
      commit((p) => {
        if (next.status) p.set('status', next.status); else p.delete('status')
        if (next.from) p.set('from', next.from); else p.delete('from')
        if (next.to) p.set('to', next.to); else p.delete('to')
      }),
    [commit],
  )
  const cycleSort = useCallback(
    (field: SortField) =>
      commit((p) => {
        const f = parseFilters(searchParams)
        if (field === 'createdAt') {
          // Added is the default sort: toggle asc <-> desc (off == cleared default desc).
          if (f.sortBy === 'createdAt' && f.sortOrder === 'asc') {
            p.delete('sort'); p.delete('dir')
          } else {
            p.set('sort', 'createdAt'); p.set('dir', 'asc')
          }
          return
        }
        if (f.sortBy !== field) {           // inactive -> asc
          p.set('sort', field); p.set('dir', 'asc')
        } else if (f.sortOrder === 'asc') { // asc -> desc (dir omitted = default desc)
          p.set('sort', field); p.delete('dir')
        } else {                            // desc -> off -> default createdAt desc
          p.delete('sort'); p.delete('dir')
        }
      }),
    [commit, searchParams],
  )
  const setPage = useCallback(
    (page: number) => commit((p) => { if (page > 1) p.set('page', String(page)); else p.delete('page') }, false),
    [commit],
  )
  const resetAll = useCallback(
    () => commit((p) => { for (const k of FILTER_KEYS) p.delete(k) }, false),
    [commit],
  )

  return {
    filters,
    isBoardFiltered: computeBoardFiltered(filters),
    isListFiltered: computeListFiltered(filters),
    setSearch,
    setStatus,
    setGhost,
    setDateRange,
    applyFilters,
    cycleSort,
    setPage,
    resetAll,
  }
}
