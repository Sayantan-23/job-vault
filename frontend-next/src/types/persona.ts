import type { ProfileContent } from './profile'

export interface Persona {
  id: string
  createdAt: string
  updatedAt: string
  userId: string
  name: string
  data: ProfileContent
  rawInput: string | null
}

export interface ParsedResume {
  content: ProfileContent
  rawText: string
}

export interface AiStatus {
  enabled: boolean
  maxPersonas: number
}
