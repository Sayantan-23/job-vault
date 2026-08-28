export type SearchResultType = 'job' | 'resume' | 'coverLetter' | 'persona' | 'answer'

export interface SearchResult {
  type: SearchResultType
  id: string
  title: string
  subtitle: string | null
  // Ranked excerpt from the backend, with matches wrapped in STX/ETX control
  // characters (\x02 … \x03) — never HTML, because job snapshots are scraped
  // from third-party pages.
  snippet: string | null
}

// A Record rather than a switch: adding a type to SearchResultType breaks the
// build here instead of silently falling through to a default href.
const HREFS: Record<SearchResultType, (id: string) => string> = {
  job: (id) => `/app/jobs?job=${id}`,
  resume: (id) => `/app/resumes?resume=${id}`,
  coverLetter: (id) => `/app/cover-letters/${id}`,
  persona: (id) => `/app/personas?persona=${id}`,
  answer: (id) => `/app/answers?answer=${id}`,
}

export function searchResultHref(result: Pick<SearchResult, 'type' | 'id'>): string {
  return HREFS[result.type](result.id)
}
