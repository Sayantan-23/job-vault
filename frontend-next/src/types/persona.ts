import type { ResumeContent } from './resume'

export interface Persona {
  id: string
  createdAt: string
  updatedAt: string
  userId: string
  name: string
  data: ResumeContent
  rawInput: string | null
}

export interface AiStatus {
  enabled: boolean
  maxPersonas: number
}
