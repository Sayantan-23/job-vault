export interface AuthUser {
  id: string
  name: string
  email: string
  isEmailVerified: boolean
  masterResumeUrl: string | null
  masterProfileJson: Record<string, unknown> | null
  preferences: { theme?: 'light' | 'dark' | 'system'; defaultView?: 'kanban' | 'list' } | null
  createdAt: string
  updatedAt: string
}
