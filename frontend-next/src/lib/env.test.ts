import { describe, it, expect } from 'vitest'
import { parseEnv } from './env'

describe('parseEnv', () => {
  const valid = {
    NEXT_PUBLIC_API_BASE: 'http://localhost:3000',
    NODE_ENV: 'development',
  }

  it('parses a valid environment', () => {
    const env = parseEnv(valid)
    expect(env.NEXT_PUBLIC_API_BASE).toBe('http://localhost:3000')
    expect(env.NODE_ENV).toBe('development')
  })

  it('throws when NEXT_PUBLIC_API_BASE is not a URL', () => {
    expect(() => parseEnv({ ...valid, NEXT_PUBLIC_API_BASE: 'not-a-url' })).toThrowError(
      /NEXT_PUBLIC_API_BASE/,
    )
  })

  it('throws when NEXT_PUBLIC_API_BASE is missing', () => {
    const broken: Record<string, string | undefined> = { ...valid }
    delete broken['NEXT_PUBLIC_API_BASE']
    expect(() => parseEnv(broken)).toThrowError(/NEXT_PUBLIC_API_BASE/)
  })
})
