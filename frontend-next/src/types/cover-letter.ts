export interface CoverLetter {
  id: string
  createdAt: string
  updatedAt: string
  userId: string
  jobId: string
  personaId: string | null
  title: string | null
  instructions: string | null
  bodyMarkdown: string
}
