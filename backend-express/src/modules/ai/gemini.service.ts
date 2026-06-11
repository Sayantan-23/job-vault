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

// Strips the `null`s that smaller models (e.g. the flash-lite fallback) love
// to emit for fields they have no value for: recursively deletes object
// properties whose value is null and filters null/undefined entries out of
// arrays. WHY this is loss-free for our AI schemas: every intentionally-
// nullable field (MonthYear.month, startDate/endDate) is declared
// `.nullable().default(null)`, so deleting a null key lets Zod's default
// restore the exact same null — while `.optional()` fields (phone, tagline,
// period, grade, employmentType, …) reject an explicit null outright, which
// is precisely the failure mode this absorbs.
export function sanitizeModelJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.filter((entry) => entry !== null && entry !== undefined).map(sanitizeModelJson)
  }
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, prop] of Object.entries(value)) {
      if (prop === null) continue
      out[key] = sanitizeModelJson(prop)
    }
    return out
  }
  return value
}

const MAX_FEEDBACK_ISSUES = 10

// Input param fixed to `unknown` so T binds to the schema's OUTPUT type (with
// defaults applied), not its input type — callers get a fully-formed value.
// The model occasionally emits truncated/malformed JSON or misses the schema —
// the parsed JSON is null-sanitized (see sanitizeModelJson) before validation,
// and one retry re-prompts WITH the failure fed back (parse error or the Zod
// issues) so the model can actually correct itself; provider errors (quota,
// network, timeout) from callModel are NOT retried here (the SDK retries
// internally).
async function generateStructured<T>(prompt: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<T> {
  let currentPrompt = prompt
  let failure: { error: AppError; issues: string[]; rawPreview: string } = {
    error: new AppError('VALIDATION_ERROR', 'AI returned malformed JSON'),
    issues: [],
    rawPreview: '',
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await callModel(currentPrompt, { responseMimeType: 'application/json' })
    const raw = res.text ?? ''
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch (err) {
      failure = {
        error: new AppError('VALIDATION_ERROR', 'AI returned malformed JSON', err),
        issues: [err instanceof Error ? err.message : 'invalid JSON'],
        rawPreview: raw.slice(0, 500),
      }
      currentPrompt = `${prompt}\n\nYour previous response was not valid JSON. Return ONLY the corrected JSON object, no commentary.`
      continue
    }
    const result = schema.safeParse(sanitizeModelJson(parsed))
    if (result.success) return result.data
    const issues = result.error.issues
      .slice(0, MAX_FEEDBACK_ISSUES)
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    failure = {
      error: new AppError('VALIDATION_ERROR', 'AI output did not match the expected shape', result.error),
      issues,
      rawPreview: raw.slice(0, 500),
    }
    currentPrompt = `${prompt}\n\nYour previous response failed validation with these problems:\n${issues.join('\n')}\nReturn ONLY the corrected JSON object.`
  }
  // Both attempts failed — log the diagnostics (capped issues + a short raw
  // preview, never the full output) so a misbehaving model is debuggable.
  logger.warn(
    { issues: failure.issues, rawPreview: failure.rawPreview },
    'gemini structured output failed validation after retry',
  )
  throw failure.error
}

export const geminiService = { isAiEnabled, generateText, generateStructured }
