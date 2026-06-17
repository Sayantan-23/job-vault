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

describe('parseEnv ENABLE_REALTIME', () => {
  const base = {
    CORS_ORIGINS: 'http://localhost:8080',
    DATABASE_URL: 'postgres://user:pw@localhost:5432/db',
    JWT_SECRET: 'a'.repeat(32),
  }

  it('defaults ENABLE_REALTIME to false when unset', () => {
    expect(parseEnv(base).ENABLE_REALTIME).toBe(false)
  })

  it('parses the string "false" as boolean false (not the z.coerce.boolean footgun)', () => {
    expect(parseEnv({ ...base, ENABLE_REALTIME: 'false' }).ENABLE_REALTIME).toBe(false)
  })

  it('parses the string "true" as boolean true', () => {
    expect(parseEnv({ ...base, ENABLE_REALTIME: 'true' }).ENABLE_REALTIME).toBe(true)
  })

  it('parses the string "1" as boolean true', () => {
    expect(parseEnv({ ...base, ENABLE_REALTIME: '1' }).ENABLE_REALTIME).toBe(true)
  })
})

describe('SCRAPER_RENDER_ENABLED', () => {
  const base = {
    CORS_ORIGINS: 'http://localhost:8080',
    DATABASE_URL: 'postgres://x:x@x:5432/x',
    JWT_SECRET: 'a'.repeat(32),
  }

  it('defaults to TRUE when absent (render fallback on by default)', () => {
    expect(parseEnv(base).SCRAPER_RENDER_ENABLED).toBe(true)
  })
  it('parses "false" -> false', () => {
    expect(parseEnv({ ...base, SCRAPER_RENDER_ENABLED: 'false' }).SCRAPER_RENDER_ENABLED).toBe(false)
  })
  it('parses "0" -> false', () => {
    expect(parseEnv({ ...base, SCRAPER_RENDER_ENABLED: '0' }).SCRAPER_RENDER_ENABLED).toBe(false)
  })
  it('parses "true"/"1" -> true', () => {
    expect(parseEnv({ ...base, SCRAPER_RENDER_ENABLED: 'true' }).SCRAPER_RENDER_ENABLED).toBe(true)
    expect(parseEnv({ ...base, SCRAPER_RENDER_ENABLED: '1' }).SCRAPER_RENDER_ENABLED).toBe(true)
  })
})

const BASE = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  CORS_ORIGINS: 'http://localhost:8080',
  JWT_SECRET: 'a'.repeat(32),
}

describe('parseEnv AI/persona settings', () => {
  it('defaults model, rate limit and persona cap; AI key is optional', () => {
    const env = parseEnv(BASE)
    expect(env.GEMINI_API_KEY).toBeUndefined()
    expect(env.GEMINI_MODEL).toBe('gemini-3.5-flash')
    expect(env.AI_RATE_LIMIT_PER_HOUR).toBe(10)
    expect(env.MAX_PERSONAS).toBe(5)
  })

  it('reads overrides', () => {
    const env = parseEnv({ ...BASE, GEMINI_API_KEY: 'k', GEMINI_MODEL: 'gemini-2.5-flash', AI_RATE_LIMIT_PER_HOUR: '3', MAX_PERSONAS: '8' })
    expect(env.GEMINI_API_KEY).toBe('k')
    expect(env.GEMINI_MODEL).toBe('gemini-2.5-flash')
    expect(env.AI_RATE_LIMIT_PER_HOUR).toBe(3)
    expect(env.MAX_PERSONAS).toBe(8)
  })
})
