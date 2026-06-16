export interface AdhocJob {
  title: string
  company: string
  description?: string
}

export type RefineAction = 'humanize' | 'shorten' | 'lengthen' | 'fix-grammar' | 'custom'

export interface CoverLetter {
  id: string
  createdAt: string
  updatedAt: string
  userId: string
  jobId: string | null
  adhocJob: AdhocJob | null
  personaId: string | null
  title: string | null
  instructions: string | null
  bodyMarkdown: string
}
