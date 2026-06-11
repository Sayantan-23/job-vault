import { GoogleGenAI, type GenerateContentResponse } from '@google/genai'
import type { z } from 'zod'
import { getEnv } from '@/config/env.js'
import { AppError } from '@/shared/errors.js'

let client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  const key = getEnv().GEMINI_API_KEY
  if (!key) throw new AppError('SERVICE_UNAVAILABLE', 'AI features are not configured')
  // Without an explicit timeout a hung provider call rides undici's 5-minute
  // headers timeout while the proxy/browser has long given up — bound it so
  // failures surface quickly as our envelope.
  if (!client) client = new GoogleGenAI({ apiKey: key, httpOptions: { timeout: 60_000 } })
  return client
}

// Walks the error `cause` chain looking for timeout/abort markers: undici
// HeadersTimeoutError, fetch AbortError, the SDK's own timeout, and the
// provider's server-side deadline (the SDK forwards httpOptions.timeout as a
// server deadline, so a slow generation comes back as HTTP 504 DEADLINE_EXCEEDED).
function isTimeoutError(err: unknown): boolean {
  let current: unknown = err
  for (let depth = 0; current && depth < 5; depth++) {
    const { name, code, status, message } = current as {
      name?: string
      code?: string
      status?: unknown
      message?: string
    }
    if (
      name === 'AbortError' ||
      name === 'HeadersTimeoutError' ||
      name === 'TimeoutError' ||
      code === 'UND_ERR_HEADERS_TIMEOUT' ||
      status === 504 ||
      /timed?\s?out|timeout|DEADLINE_EXCEEDED|deadline expired/i.test(message ?? '')
    ) {
      return true
    }
    current = (current as { cause?: unknown }).cause
  }
  return false
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
    // A timed-out/aborted call is transient — tell the user to retry instead of
    // presenting it as a server fault.
    if (isTimeoutError(err)) {
      throw new AppError('SERVICE_UNAVAILABLE', 'The AI request timed out. Please try again.', err)
    }
    // Provider-side overload (HTTP 503 UNAVAILABLE, "high demand") is equally
    // transient — surface it as retryable, not as our fault.
    if (status === 503 || /\bUNAVAILABLE\b|overloaded|high demand/i.test(message)) {
      throw new AppError('SERVICE_UNAVAILABLE', 'The AI model is currently overloaded. Please try again in a moment.', err)
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
// The model occasionally emits truncated/malformed JSON or misses the schema —
// one transparent retry absorbs most of those; provider errors (quota, network,
// timeout) from callModel are NOT retried here (the SDK retries internally).
async function generateStructured<T>(prompt: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
  let lastError = new AppError('VALIDATION_ERROR', 'AI returned malformed JSON')
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await callModel(prompt, { responseMimeType: 'application/json' })
    let parsed: unknown
    try {
      parsed = JSON.parse(res.text ?? '')
    } catch {
      lastError = new AppError('VALIDATION_ERROR', 'AI returned malformed JSON')
      continue
    }
    const result = schema.safeParse(parsed)
    if (result.success) return result.data
    lastError = new AppError('VALIDATION_ERROR', 'AI output did not match the expected shape')
  }
  throw lastError
}

export const geminiService = { isAiEnabled, generateText, generateStructured }
