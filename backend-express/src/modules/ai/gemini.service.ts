import { GoogleGenAI, type GenerateContentResponse } from '@google/genai'
import type { z } from 'zod'
import { getEnv } from '@/config/env.js'
import { AppError } from '@/shared/errors.js'
import { logger } from '@/shared/logger.js'

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

// Maps a raw SDK/provider error to our envelope so provider internals never
// leak to the client. Provider detail stays in the logged `cause`; the client
// message is generic. Applied per attempt so the fallback chain reuses it.
function mapProviderError(err: unknown): AppError {
  const status = (err as { status?: unknown }).status
  const message = err instanceof Error ? err.message : ''
  // A provider quota/rate-limit (HTTP 429 / RESOURCE_EXHAUSTED) is retry-able —
  // surface it as our RATE_LIMITED (429), not a 500.
  if (status === 429 || /RESOURCE_EXHAUSTED|quota|rate.?limit/i.test(message)) {
    return new AppError('RATE_LIMITED', 'The AI service is busy or out of quota. Please try again shortly.', err)
  }
  // A timed-out/aborted call is transient — tell the user to retry instead of
  // presenting it as a server fault.
  if (isTimeoutError(err)) {
    return new AppError('SERVICE_UNAVAILABLE', 'The AI request timed out. Please try again.', err)
  }
  // Provider-side overload (HTTP 503 UNAVAILABLE, "high demand") is equally
  // transient — surface it as retryable, not as our fault.
  if (status === 503 || /\bUNAVAILABLE\b|overloaded|high demand/i.test(message)) {
    return new AppError('SERVICE_UNAVAILABLE', 'The AI model is currently overloaded. Please try again in a moment.', err)
  }
  return new AppError('INTERNAL_ERROR', 'AI service request failed', err)
}

// Wraps the SDK call so provider errors surface as our envelope (see
// mapProviderError). When the primary model fails transiently — timeout or
// 503 overload, the only classes mapProviderError turns into
// SERVICE_UNAVAILABLE — the same request is retried once on
// GEMINI_FALLBACK_MODEL (if set and different). 429/quota is account-level
// and auth/generic errors would fail identically on any model, so those
// surface immediately. getClient() stays outside the try so its
// SERVICE_UNAVAILABLE ("not configured") propagates before any attempt.
async function callModel(
  prompt: string,
  config?: { responseMimeType: string },
): Promise<GenerateContentResponse> {
  const client = getClient()
  const env = getEnv()
  const attempt = (model: string) =>
    client.models.generateContent({ model, contents: prompt, ...(config ? { config } : {}) })

  try {
    return await attempt(env.GEMINI_MODEL)
  } catch (err) {
    if (err instanceof AppError) throw err
    const mapped = mapProviderError(err)
    const fallback = env.GEMINI_FALLBACK_MODEL
    if (mapped.code !== 'SERVICE_UNAVAILABLE' || !fallback || fallback === env.GEMINI_MODEL) {
      throw mapped
    }
    logger.warn(
      { primaryModel: env.GEMINI_MODEL, fallbackModel: fallback },
      'gemini primary model failed transiently, retrying on fallback',
    )
    try {
      return await attempt(fallback)
    } catch (fallbackErr) {
      if (fallbackErr instanceof AppError) throw fallbackErr
      // The fallback attempt's own mapping wins — its failure class is the
      // freshest signal for the user (e.g. overloaded primary + timed-out fallback).
      throw mapProviderError(fallbackErr)
    }
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
