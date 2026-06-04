'use client'

import { useCallback } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { parseFilters, isFiltered as computeIsFiltered } from '@/lib/filters'
import type { GhostFilter, JobFilters, SortField } from '@/types/filters'
import type { JobStatus } from '@/lib/job-status'

export interface UseJobFilters {
  filters: JobFilters
  isFiltered: boolean
  setSearch: (value: string) => void
  setStatus: (value: JobStatus | undefined) => void
  setGhost: (value: GhostFilter) => void
  /** Sets `field` (desc by default), or toggles direction when `field` is already active. */
  setSort: (field: SortField) => void
  setPage: (page: number) => void
  resetAll: () => void
}

const FILTER_KEYS = ['search', 'status', 'ghost', 'sort', 'dir', 'page'] as const

export function useJobFilters(): UseJobFilters {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const filters = parseFilters(searchParams)

  // Clones the current params, applies `mutate`, optionally resets page, and
  // replaces the URL — always preserving non-filter params (view/job).
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
  const setSort = useCallback(
    (field: SortField) =>
      commit((p) => {
        const current = parseFilters(searchParams)
        const nextOrder = current.sortBy === field && current.sortOrder === 'desc' ? 'asc' : 'desc'
        if (field === 'createdAt') p.delete('sort')
        else p.set('sort', field)
        if (nextOrder === 'asc') p.set('dir', 'asc')
        else p.delete('dir')
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
    isFiltered: computeIsFiltered(filters),
    setSearch,
    setStatus,
    setGhost,
    setSort,
    setPage,
    resetAll,
  }
}
