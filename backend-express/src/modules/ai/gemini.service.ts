import { GoogleGenAI } from '@google/genai'
import type { z } from 'zod'
import { getEnv } from '@/config/env.js'
import { AppError } from '@/shared/errors.js'

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  const key = getEnv().GEMINI_API_KEY
  if (!key) throw new AppError('SERVICE_UNAVAILABLE', 'AI features are not configured')
  if (!client) client = new GoogleGenAI({ apiKey: key })
  return client
}

function isAiEnabled(): boolean {
  return Boolean(getEnv().GEMINI_API_KEY)
}

async function generateText(prompt: string): Promise<string> {
  const res = await getClient().models.generateContent({ model: getEnv().GEMINI_MODEL, contents: prompt })
  const text = res.text
  if (!text) throw new AppError('INTERNAL_ERROR', 'AI returned an empty response')
  return text
}

async function generateStructured<T>(prompt: string, schema: z.ZodType<T>): Promise<T> {
  const res = await getClient().models.generateContent({
    model: getEnv().GEMINI_MODEL,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
  })
  let parsed: unknown
  try {
    parsed = JSON.parse(res.text ?? '')
  } catch {
    throw new AppError('VALIDATION_ERROR', 'AI returned malformed JSON')
  }
  const result = schema.safeParse(parsed)
  if (!result.success) throw new AppError('VALIDATION_ERROR', 'AI output did not match the expected shape')
  return result.data
}

export const geminiService = { isAiEnabled, generateText, generateStructured }
