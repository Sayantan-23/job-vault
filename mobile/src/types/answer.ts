export interface Answer {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  question: string;
  answerShort: string | null;
  answerLong: string | null;
  lastUsedAt: string | null;
}

export interface AnswerDraft {
  short: string;
  long: string;
}

export interface GenerateAnswerBody {
  question: string;
  personaId: string;
  jobId?: string;
  instructions?: string;
}

export interface AnswerBody {
  question: string;
  answerShort?: string;
  answerLong?: string;
}
