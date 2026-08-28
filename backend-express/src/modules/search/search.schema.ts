import { z } from 'zod'

export const SearchQuerySchema = z.object({ q: z.string().trim().min(1).max(200) })

export type SearchQueryInput = z.infer<typeof SearchQuerySchema>

export type SearchResultType = 'job' | 'resume' | 'coverLetter' | 'persona' | 'answer'

export type SearchResult = {
  type: SearchResultType
  id: string
  title: string
  subtitle: string | null
  snippet: string | null
}
