import { z } from 'zod'
import type { UserRow } from '@/db/schema/users.js'

export const RegisterSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(72),
})

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  preferences: z
    .object({
      theme: z.enum(['light', 'dark', 'system']).optional(),
      defaultView: z.enum(['kanban', 'list']).optional(),
    })
    .optional(),
  masterProfileJson: z.record(z.string(), z.unknown()).optional(),
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>

export interface PublicUser {
  id: string
  name: string
  email: string
  isEmailVerified: boolean
  masterResumeUrl: string | null
  masterProfileJson: Record<string, unknown> | null
  preferences: UserRow['preferences']
  createdAt: Date
  updatedAt: Date
}

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isEmailVerified: user.isEmailVerified,
    masterResumeUrl: user.masterResumeUrl,
    masterProfileJson: user.masterProfileJson,
    preferences: user.preferences,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
