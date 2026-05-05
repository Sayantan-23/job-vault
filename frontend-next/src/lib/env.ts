import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_API_BASE: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
})

export type Env = z.infer<typeof envSchema>

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')
    throw new Error(`Invalid environment:\n${issues}`)
  }
  return result.data
}

let _env: Env | undefined
/** Lazily reads and validates `process.env` on first call; caches the result. */
export function getEnv(): Env {
  if (!_env) _env = parseEnv(process.env as Record<string, string | undefined>)
  return _env
}
