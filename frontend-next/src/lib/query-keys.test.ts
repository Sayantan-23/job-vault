import { describe, it, expect } from 'vitest'
import { JOBS_KEY, DASHBOARD_KANBAN_KEY, jobsListKey, kanbanKey } from './query-keys'
import { DEFAULT_FILTERS } from '@/types/filters'

describe('jobsListKey', () => {
  it('nests under the JOBS_KEY prefix so prefix-invalidation still matches', () => {
    const key = jobsListKey(DEFAULT_FILTERS)
    expect(key.slice(0, JOBS_KEY.length)).toEqual([...JOBS_KEY])
    expect(key[1]).toBe('list')
  })

  it('differs when any filter differs', () => {
    expect(jobsListKey(DEFAULT_FILTERS)).not.toEqual(jobsListKey({ ...DEFAULT_FILTERS, page: 2 }))
  })
})

describe('kanbanKey', () => {
  it('nests under the DASHBOARD_KANBAN_KEY prefix', () => {
    const key = kanbanKey({ search: '', ghost: 'all' })
    expect(key.slice(0, DASHBOARD_KANBAN_KEY.length)).toEqual([...DASHBOARD_KANBAN_KEY])
  })

  it('differs when search or ghost differs', () => {
    expect(kanbanKey({ search: '', ghost: 'all' })).not.toEqual(kanbanKey({ search: 'x', ghost: 'all' }))
    expect(kanbanKey({ search: '', ghost: 'all' })).not.toEqual(kanbanKey({ search: '', ghost: 'ghost' }))
  })
})
