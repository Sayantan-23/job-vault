import {
  AI_STATUS_KEY,
  ANSWERS_KEY,
  COVER_LETTERS_KEY,
  DASHBOARD_STATS_KEY,
  PERSONAS_KEY,
  PROFILE_KEY,
  RESUMES_KEY,
  coverLetterKey,
  coverLettersByJobKey,
  globalTimelineKey,
  jobsListKey,
  kanbanKey,
  resumesByJobKey,
  searchKey,
} from './query-keys'
import { buildBoardQuery, buildListQuery } from './filters'
import type { GhostFilter, JobFilters } from '@/types/filters'

// A cache key paired with the endpoint that fills it. Server prefetches and
// client hooks both read from here, so the two can never drift: a key that no
// longer matches its path hydrates nothing — a silent cache miss that looks
// exactly like "the data didn't load", which is the failure mode this file
// exists to make impossible.
//
// Isomorphic on purpose — keys and paths only, no fetcher. The server fetches
// through `apiServer` (cookies + internal URL), the browser through `apiClient`
// (same-origin), so the transport stays with the caller.
export interface QueryDesc {
  key: readonly unknown[]
  path: string
}

export const TIMELINE_PAGE_SIZE = 50

export const jobsListQuery = (f: JobFilters): QueryDesc => ({
  key: jobsListKey(f),
  path: `/api/jobs${buildListQuery(f)}`,
})

export const kanbanQuery = (f: { search: string; ghost: GhostFilter }): QueryDesc => ({
  key: kanbanKey(f),
  path: `/api/dashboard/kanban${buildBoardQuery(f)}`,
})

export const statsQuery: QueryDesc = { key: DASHBOARD_STATS_KEY, path: '/api/dashboard/stats' }

export const personasQuery: QueryDesc = { key: PERSONAS_KEY, path: '/api/personas' }

export const aiStatusQuery: QueryDesc = { key: AI_STATUS_KEY, path: '/api/ai/status' }

export const profileQuery: QueryDesc = { key: PROFILE_KEY, path: '/api/profile' }

export const resumesQuery = (jobId?: string): QueryDesc =>
  jobId
    ? { key: resumesByJobKey(jobId), path: `/api/resumes?jobId=${jobId}` }
    : { key: RESUMES_KEY, path: '/api/resumes' }

export const coverLettersQuery: QueryDesc = { key: COVER_LETTERS_KEY, path: '/api/cover-letters' }

export const answersQuery: QueryDesc = { key: ANSWERS_KEY, path: '/api/answers' }

export const searchQuery = (q: string): QueryDesc => ({
  key: searchKey(q),
  path: `/api/search?q=${encodeURIComponent(q)}`,
})

export const coverLettersByJobQuery = (jobId: string): QueryDesc => ({
  key: coverLettersByJobKey(jobId),
  path: `/api/cover-letters?jobId=${jobId}`,
})

export const coverLetterQuery = (id: string): QueryDesc => ({
  key: coverLetterKey(id),
  path: `/api/cover-letters/${id}`,
})

export const globalTimelineQuery = (page: number): QueryDesc => ({
  key: globalTimelineKey(page),
  path: `/api/timeline?page=${page}&limit=${TIMELINE_PAGE_SIZE}`,
})
