import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

vi.mock('@/modules/api-keys/api-keys.service.js', () => ({
  apiKeysService: { verifyRawKey: vi.fn() },
}))

import { apiKeysService } from '@/modules/api-keys/api-keys.service.js'
import { apiKeyMiddleware } from './api-key.middleware.js'
import { AppError } from '@/shared/errors.js'

const svc = vi.mocked(apiKeysService)
const asType = <T>(value: unknown): T => value as T

function invoke(headers: Record<string, string>) {
  const req = asType<Request>({ header: (name: string) => headers[name.toLowerCase()] })
  const next = vi.fn()
  return { req, res: asType<Response>({}), next }
}

beforeEach(() => vi.clearAllMocks())

describe('apiKeyMiddleware', () => {
  it('forwards UNAUTHORIZED when the X-API-Key header is missing', () => {
    const { req, res, next } = invoke({})
    apiKeyMiddleware(req, res, next as unknown as NextFunction)
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(AppError)
    expect(next.mock.calls[0]?.[0]?.code).toBe('UNAUTHORIZED')
  })

  it('forwards UNAUTHORIZED when the key is invalid', async () => {
    svc.verifyRawKey.mockResolvedValue(null)
    const { req, res, next } = invoke({ 'x-api-key': 'jv_bad' })
    apiKeyMiddleware(req, res, next as unknown as NextFunction)
    await new Promise((r) => setImmediate(r))
    expect(next.mock.calls[0]?.[0]).toBeInstanceOf(AppError)
    expect(next.mock.calls[0]?.[0]?.code).toBe('UNAUTHORIZED')
  })

  it('sets req.apiKey and calls next() for a valid key', async () => {
    svc.verifyRawKey.mockResolvedValue({ id: 'k1', userId: 'u1' })
    const { req, res, next } = invoke({ 'x-api-key': 'jv_good' })
    apiKeyMiddleware(req, res, next as unknown as NextFunction)
    await new Promise((r) => setImmediate(r))
    expect(req.apiKey).toEqual({ id: 'k1', userId: 'u1' })
    expect(next.mock.calls[0]).toEqual([])
  })
})
