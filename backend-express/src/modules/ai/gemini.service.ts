import { GoogleGenAI, type GenerateContentResponse } from '@google/genai'
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

// Wraps the SDK call so a provider error (auth, quota, network) surfaces as a
// generic INTERNAL_ERROR instead of leaking provider internals to the client.
// getClient() stays outside the try so its SERVICE_UNAVAILABLE propagates as-is.
async function callModel(
  prompt: string,
  config?: { responseMimeType: string },
): Promise<GenerateContentResponse> {
  const client = getClient()
  try {
    return await client.models.generateContent({
      model: getEnv().GEMINI_MODEL,
      contents: prompt,
      ...(config ? { config } : {}),
    })
  } catch (err) {
    if (err instanceof AppError) throw err
    // A provider quota/rate-limit (HTTP 429 / RESOURCE_EXHAUSTED) is retry-able —
    // surface it as our RATE_LIMITED (429), not a 500. Provider detail stays in
    // the logged `cause`; the client message is generic.
    const status = (err as { status?: unknown }).status
    const message = err instanceof Error ? err.message : ''
    if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(message)) {
      throw new AppError('RATE_LIMITED', 'The AI service is busy or out of quota. Please try again shortly.', err)
    }
    throw new AppError('INTERNAL_ERROR', 'AI service request failed', err)
  }
}

async function generateText(prompt: string): Promise<string> {
  const res = await callModel(prompt)
  const text = res.text
  if (!text) throw new AppError('INTERNAL_ERROR', 'AI returned an empty response')
  return text
}

// Input param fixed to `unknown` so T binds to the schema's OUTPUT type (with
// defaults applied), not its input type — callers get a fully-formed value.
async function generateStructured<T>(prompt: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
  const res = await callModel(prompt, { responseMimeType: 'application/json' })
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
