import { z } from 'zod'

export const CreateApiKeySchema = z.object({
  name: z.string().trim().min(1).max(100),
})

export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>

/** Public shape returned to the web app — never includes the secret/hash. */
export interface ApiKeyPublic {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: Date | null
  createdAt: Date
}

/** Returned exactly once, at creation, so the caller can hand the raw key off. */
export interface CreatedApiKey extends ApiKeyPublic {
  rawKey: string
}
