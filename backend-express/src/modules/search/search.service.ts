import { searchRepository } from './search.repository.js'
import type { SearchResult } from './search.schema.js'

// The client debounces but still fires at one character; an error there is
// noise, not a fault, so a too-short term is an empty result set.
const MIN_TERM_LENGTH = 2

async function search(userId: string, q: string): Promise<SearchResult[]> {
  const term = q.trim()
  if (term.length < MIN_TERM_LENGTH) return []
  return searchRepository.search(userId, term)
}

export const searchService = { search }
