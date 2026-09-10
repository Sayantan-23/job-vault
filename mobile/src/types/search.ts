export type SearchResultType = 'job' | 'resume' | 'coverLetter' | 'persona' | 'answer';

export interface SearchResult {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string | null;
  // Ranked excerpt from the backend, with matches wrapped in STX/ETX control
  // characters (\u0002 … \u0003) — never HTML, because job snapshots are scraped
  // from third-party pages.
  snippet: string | null;
}

// A Record rather than a switch: adding a type to SearchResultType breaks the
// build here instead of silently falling through to a default href.
const HREFS: Record<SearchResultType, (id: string) => string> = {
  job: (id) => `/jobs/${id}`,
  resume: (id) => `/vault/resume/${id}`,
  coverLetter: (id) => `/vault/cover-letter/${id}`,
  persona: (id) => `/personas/${id}`,
  answer: (id) => `/(tabs)/answers?answer=${id}`,
};

export function searchResultHref(result: Pick<SearchResult, 'type' | 'id'>): string {
  return HREFS[result.type](result.id);
}
