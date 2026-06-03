import { describe, it, expect, vi } from 'vitest'
import { parseEnv } from './env.js'

describe('parseEnv', () => {
  const validEnv = {
    NODE_ENV: 'development',
    PORT: '3000',
    CORS_ORIGINS: 'http://localhost:8080',
    DATABASE_URL: 'postgres://user:pw@localhost:5432/db',
    JWT_SECRET: 'a'.repeat(32),
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    LOG_LEVEL: 'info',
  }

  it('parses a valid environment', () => {
    const env = parseEnv(validEnv)
    expect(env.PORT).toBe(3000)
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:8080'])
    expect(env.NODE_ENV).toBe('development')
  })

  it('splits CORS_ORIGINS by comma', () => {
    const env = parseEnv({ ...validEnv, CORS_ORIGINS: 'http://a.com,http://b.com' })
    expect(env.CORS_ORIGINS).toEqual(['http://a.com', 'http://b.com'])
  })

  it('throws when DATABASE_URL is missing', () => {
    const broken: Record<string, string> = { ...validEnv }
    delete broken['DATABASE_URL']
    expect(() => parseEnv(broken)).toThrowError(/DATABASE_URL/)
  })

  it('throws when JWT_SECRET is shorter than 32 chars', () => {
    expect(() => parseEnv({ ...validEnv, JWT_SECRET: 'short' })).toThrowError(/JWT_SECRET/)
  })

  it('throws when PORT is not a positive integer', () => {
    expect(() => parseEnv({ ...validEnv, PORT: 'abc' })).toThrowError(/PORT/)
  })
})

describe('getEnv', () => {
  it('throws when the real process.env is invalid', async () => {
    const original = { ...process.env }
    delete process.env['DATABASE_URL']
    delete process.env['JWT_SECRET']
    delete process.env['CORS_ORIGINS']
    try {
      vi.resetModules()
      const fresh = await import('./env.js')
      expect(() => fresh.getEnv()).toThrow(/Invalid environment/)
    } finally {
      Object.assign(process.env, original)
    }
  })
})

describe('ENABLE_SCHEDULER', () => {
  const base = {
    CORS_ORIGINS: 'http://localhost:8080',
    DATABASE_URL: 'postgres://x:x@x:5432/x',
    JWT_SECRET: 'a'.repeat(32),
  }

  it('defaults to false when absent', () => {
    expect(parseEnv(base).ENABLE_SCHEDULER).toBe(false)
  })
  it('parses the string "true" -> true', () => {
    expect(parseEnv({ ...base, ENABLE_SCHEDULER: 'true' }).ENABLE_SCHEDULER).toBe(true)
  })
  it('parses the string "1" -> true', () => {
    expect(parseEnv({ ...base, ENABLE_SCHEDULER: '1' }).ENABLE_SCHEDULER).toBe(true)
  })
  it('parses the string "false" -> false (NOT a footgun-coerced true)', () => {
    expect(parseEnv({ ...base, ENABLE_SCHEDULER: 'false' }).ENABLE_SCHEDULER).toBe(false)
  })
})
