import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

const generateContent = vi.fn()
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({ models: { generateContent } })),
}))

// The real logger spins up a pino-pretty transport worker at module load —
// stub it so the service unit stays hermetic and the fallback warn is assertable.
const loggerWarn = vi.fn()
vi.mock('@/shared/logger.js', () => ({
  logger: { warn: loggerWarn },
}))

function loadEnv(overrides: Record<string, string> = {}) {
  process.env['DATABASE_URL'] = 'postgres://u:p@localhost:5432/db'
  process.env['CORS_ORIGINS'] = 'http://localhost:8080'
  process.env['JWT_SECRET'] = 'a'.repeat(32)
  process.env['GEMINI_MODEL'] = 'gemini-2.0-flash'
  for (const [k, v] of Object.entries(overrides)) process.env[k] = v
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  delete process.env['GEMINI_API_KEY']
  delete process.env['GEMINI_FALLBACK_MODEL']
})

describe('geminiService', () => {
  it('isAiEnabled reflects the key presence', async () => {
    loadEnv()
    const off = await import('./gemini.service.js')
    expect(off.geminiService.isAiEnabled()).toBe(false)
  })

  it('generateStructured parses + validates JSON output', async () => {
    loadEnv({ GEMINI_API_KEY: 'k' })
    generateContent.mockResolvedValue({ text: '{"value":42}' })
    const { geminiService } = await import('./gemini.service.js')
    const out = await geminiService.generateStructured('prompt', z.object({ value: z.number() }))
    expect(out).toEqual({ value: 42 })
    expect(generateContent).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gemini-2.0-flash', config: { responseMimeType: 'application/json' } }),
    )
  })

  it('throws VALIDATION_ERROR on malformed JSON after one retry', async () => {
    loadEnv({ GEMINI_API_KEY: 'k' })
    generateContent.mockResolvedValue({ text: 'not json' })
    const { geminiService } = await import('./gemini.service.js')
    await expect(geminiService.generateStructured('p', z.object({ value: z.number() }))).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(generateContent).toHaveBeenCalledTimes(2)
  })

  it('recovers when the retry returns valid JSON', async () => {
    loadEnv({ GEMINI_API_KEY: 'k' })
    generateContent.mockResolvedValueOnce({ text: 'not json' }).mockResolvedValueOnce({ text: '{"value":7}' })
    const { geminiService } = await import('./gemini.service.js')
    await expect(geminiService.generateStructured('p', z.object({ value: z.number() }))).resolves.toEqual({ value: 7 })
    expect(generateContent).toHaveBeenCalledTimes(2)
  })

  it('retries once when output misses the schema, then throws', async () => {
    loadEnv({ GEMINI_API_KEY: 'k' })
    generateContent.mockResolvedValue({ text: '{"wrong":true}' })
    const { geminiService } = await import('./gemini.service.js')
    await expect(geminiService.generateStructured('p', z.object({ value: z.number() }))).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'AI output did not match the expected shape',
    })
    expect(generateContent).toHaveBeenCalledTimes(2)
  })

  it('maps timed-out provider calls (undici headers timeout / abort) to SERVICE_UNAVAILABLE', async () => {
    loadEnv({ GEMINI_API_KEY: 'k' })
    const headersTimeout = Object.assign(new Error('Headers Timeout Error'), {
      name: 'HeadersTimeoutError',
      code: 'UND_ERR_HEADERS_TIMEOUT',
    })
    generateContent.mockRejectedValue(Object.assign(new TypeError('fetch failed'), { cause: headersTimeout }))
    const { geminiService } = await import('./gemini.service.js')
    await expect(geminiService.generateText('p')).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      message: 'The AI request timed out. Please try again.',
    })
  })

  it('maps the provider 504 DEADLINE_EXCEEDED (server-side deadline) to SERVICE_UNAVAILABLE', async () => {
    loadEnv({ GEMINI_API_KEY: 'k' })
    generateContent.mockRejectedValue(
      Object.assign(
        new Error('{"error":{"code":504,"message":"Deadline expired before operation could complete.","status":"DEADLINE_EXCEEDED"}}'),
        { name: 'ApiError', status: 504 },
      ),
    )
    const { geminiService } = await import('./gemini.service.js')
    await expect(geminiService.generateText('p')).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      message: 'The AI request timed out. Please try again.',
    })
  })

  it('maps provider 503 UNAVAILABLE (model overloaded) to SERVICE_UNAVAILABLE', async () => {
    loadEnv({ GEMINI_API_KEY: 'k' })
    generateContent.mockRejectedValue(
      Object.assign(
        new Error('{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}'),
        { name: 'ApiError', status: 503 },
      ),
    )
    const { geminiService } = await import('./gemini.service.js')
    await expect(geminiService.generateText('p')).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      message: 'The AI model is currently overloaded. Please try again in a moment.',
    })
  })

  it('constructs the client with an explicit request timeout', async () => {
    loadEnv({ GEMINI_API_KEY: 'k' })
    generateContent.mockResolvedValue({ text: 'ok' })
    const { GoogleGenAI } = await import('@google/genai')
    const { geminiService } = await import('./gemini.service.js')
    await geminiService.generateText('p')
    expect(vi.mocked(GoogleGenAI)).toHaveBeenCalledWith(
      expect.objectContaining({ httpOptions: { timeout: 60_000 } }),
    )
  })

  it('throws SERVICE_UNAVAILABLE when disabled', async () => {
    loadEnv()
    const { geminiService } = await import('./gemini.service.js')
    await expect(geminiService.generateText('p')).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
  })

  it('wraps generic SDK/provider errors as INTERNAL_ERROR (no leak)', async () => {
    loadEnv({ GEMINI_API_KEY: 'k' })
    generateContent.mockRejectedValue(new Error('socket hang up'))
    const { geminiService } = await import('./gemini.service.js')
    await expect(geminiService.generateText('p')).rejects.toMatchObject({ code: 'INTERNAL_ERROR' })
  })

  it('maps provider 429 / quota errors to RATE_LIMITED', async () => {
    loadEnv({ GEMINI_API_KEY: 'k' })
    generateContent.mockRejectedValue(
      Object.assign(new Error('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}'), { status: 429 }),
    )
    const { geminiService } = await import('./gemini.service.js')
    await expect(geminiService.generateText('p')).rejects.toMatchObject({ code: 'RATE_LIMITED' })
  })

  describe('fallback model chain', () => {
    const overloadedError = () =>
      Object.assign(
        new Error('{"error":{"code":503,"message":"This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.","status":"UNAVAILABLE"}}'),
        { name: 'ApiError', status: 503 },
      )
    const timeoutError = () =>
      Object.assign(new TypeError('fetch failed'), {
        cause: Object.assign(new Error('Headers Timeout Error'), {
          name: 'HeadersTimeoutError',
          code: 'UND_ERR_HEADERS_TIMEOUT',
        }),
      })

    it('retries once on the fallback model when the primary is overloaded (503)', async () => {
      loadEnv({ GEMINI_API_KEY: 'k', GEMINI_FALLBACK_MODEL: 'gemini-2.0-flash-lite' })
      generateContent.mockRejectedValueOnce(overloadedError()).mockResolvedValueOnce({ text: 'ok' })
      const { geminiService } = await import('./gemini.service.js')
      await expect(geminiService.generateText('p')).resolves.toBe('ok')
      expect(generateContent).toHaveBeenCalledTimes(2)
      expect(generateContent).toHaveBeenNthCalledWith(1, expect.objectContaining({ model: 'gemini-2.0-flash' }))
      expect(generateContent).toHaveBeenNthCalledWith(2, expect.objectContaining({ model: 'gemini-2.0-flash-lite' }))
      expect(loggerWarn).toHaveBeenCalledOnce()
    })

    it('retries once on the fallback model when the primary times out', async () => {
      loadEnv({ GEMINI_API_KEY: 'k', GEMINI_FALLBACK_MODEL: 'gemini-2.0-flash-lite' })
      generateContent.mockRejectedValueOnce(timeoutError()).mockResolvedValueOnce({ text: 'ok' })
      const { geminiService } = await import('./gemini.service.js')
      await expect(geminiService.generateText('p')).resolves.toBe('ok')
      expect(generateContent).toHaveBeenCalledTimes(2)
      expect(generateContent).toHaveBeenNthCalledWith(2, expect.objectContaining({ model: 'gemini-2.0-flash-lite' }))
    })

    it('does NOT fall back on 429/quota — account-level, the fallback would fail too', async () => {
      loadEnv({ GEMINI_API_KEY: 'k', GEMINI_FALLBACK_MODEL: 'gemini-2.0-flash-lite' })
      generateContent.mockRejectedValue(
        Object.assign(new Error('{"error":{"code":429,"status":"RESOURCE_EXHAUSTED"}}'), { status: 429 }),
      )
      const { geminiService } = await import('./gemini.service.js')
      await expect(geminiService.generateText('p')).rejects.toMatchObject({ code: 'RATE_LIMITED' })
      expect(generateContent).toHaveBeenCalledTimes(1)
    })

    it('does NOT fall back on generic provider errors', async () => {
      loadEnv({ GEMINI_API_KEY: 'k', GEMINI_FALLBACK_MODEL: 'gemini-2.0-flash-lite' })
      generateContent.mockRejectedValue(new Error('socket hang up'))
      const { geminiService } = await import('./gemini.service.js')
      await expect(geminiService.generateText('p')).rejects.toMatchObject({ code: 'INTERNAL_ERROR' })
      expect(generateContent).toHaveBeenCalledTimes(1)
    })

    it('does NOT fall back when GEMINI_FALLBACK_MODEL is unset', async () => {
      loadEnv({ GEMINI_API_KEY: 'k' })
      generateContent.mockRejectedValue(overloadedError())
      const { geminiService } = await import('./gemini.service.js')
      await expect(geminiService.generateText('p')).rejects.toMatchObject({
        code: 'SERVICE_UNAVAILABLE',
        message: 'The AI model is currently overloaded. Please try again in a moment.',
      })
      expect(generateContent).toHaveBeenCalledTimes(1)
    })

    it('does NOT fall back when the fallback model equals the primary', async () => {
      loadEnv({ GEMINI_API_KEY: 'k', GEMINI_FALLBACK_MODEL: 'gemini-2.0-flash' })
      generateContent.mockRejectedValue(overloadedError())
      const { geminiService } = await import('./gemini.service.js')
      await expect(geminiService.generateText('p')).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
      expect(generateContent).toHaveBeenCalledTimes(1)
    })

    it('surfaces the fallback attempt error when both models fail transiently', async () => {
      loadEnv({ GEMINI_API_KEY: 'k', GEMINI_FALLBACK_MODEL: 'gemini-2.0-flash-lite' })
      generateContent.mockRejectedValueOnce(overloadedError()).mockRejectedValueOnce(timeoutError())
      const { geminiService } = await import('./gemini.service.js')
      await expect(geminiService.generateText('p')).rejects.toMatchObject({
        code: 'SERVICE_UNAVAILABLE',
        message: 'The AI request timed out. Please try again.',
      })
      expect(generateContent).toHaveBeenCalledTimes(2)
    })
  })
})
