import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'

const generateContent = vi.fn()
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(() => ({ models: { generateContent } })),
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

  it('throws VALIDATION_ERROR on malformed JSON', async () => {
    loadEnv({ GEMINI_API_KEY: 'k' })
    generateContent.mockResolvedValue({ text: 'not json' })
    const { geminiService } = await import('./gemini.service.js')
    await expect(geminiService.generateStructured('p', z.object({ value: z.number() }))).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('throws SERVICE_UNAVAILABLE when disabled', async () => {
    loadEnv()
    const { geminiService } = await import('./gemini.service.js')
    await expect(geminiService.generateText('p')).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
  })

  it('wraps SDK/provider errors as INTERNAL_ERROR (no leak)', async () => {
    loadEnv({ GEMINI_API_KEY: 'k' })
    generateContent.mockRejectedValue(new Error('429 quota exceeded'))
    const { geminiService } = await import('./gemini.service.js')
    await expect(geminiService.generateText('p')).rejects.toMatchObject({ code: 'INTERNAL_ERROR' })
  })
})
