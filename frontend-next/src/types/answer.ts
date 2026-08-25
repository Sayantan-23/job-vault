export interface Answer {
  id: string
  createdAt: string
  updatedAt: string
  userId: string
  question: string
  answerShort: string | null
  answerLong: string | null
  lastUsedAt: string | null
}

// Both length variants from one generate call — a candidate, not a saved row.
export interface AnswerDraft {
  short: string
  long: string
}

export interface GenerateAnswerBody {
  question: string
  personaId: string
  jobId?: string
  instructions?: string
}
