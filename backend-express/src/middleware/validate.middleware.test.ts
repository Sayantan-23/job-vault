import { describe, it, expect, vi } from 'vitest'
import { z } from 'zod'
import type { Request, Response, NextFunction } from 'express'
import { validate } from './validate.middleware.js'

const Schema = z.object({ email: z.string().email() })

// Small typed-cast helper: keeps object literals out of `as`-assertions so the
// `objectLiteralTypeAssertions: 'never'` lint rule is satisfied.
const asType = <T>(value: unknown): T => value as T

function run(body: unknown) {
  const req = asType<Request>({ body })
  const res = asType<Response>({})
  const next = vi.fn() as unknown as NextFunction
  validate(Schema)(req, res, next)
  return { req, next: next as unknown as ReturnType<typeof vi.fn> }
}

describe('validate', () => {
  it('passes and replaces req.body with parsed data on success', () => {
    const { req, next } = run({ email: 'a@b.co', extra: 'stripped?' })
    expect(next).toHaveBeenCalledOnce()
    expect(next.mock.calls[0]).toEqual([])
    expect((req.body as { email: string }).email).toBe('a@b.co')
  })

  it('forwards a ZodError to next() on failure', () => {
    const { next } = run({ email: 'nope' })
    expect(next).toHaveBeenCalledOnce()
    const arg = next.mock.calls[0]?.[0]
    expect(arg).toBeInstanceOf(z.ZodError)
  })

  it('validates a non-body source (query) and coerces in place', () => {
    const req = asType<Request>({ query: { page: '2' } })
    const res = asType<Response>({})
    const next = vi.fn() as unknown as NextFunction
    validate(z.object({ page: z.coerce.number() }), 'query')(req, res, next)
    expect((next as unknown as ReturnType<typeof vi.fn>).mock.calls[0]).toEqual([])
    expect((req.query as unknown as { page: number }).page).toBe(2)
  })

  it('forwards a ZodError for an invalid query param', () => {
    const req = asType<Request>({ query: { page: 'abc' } })
    const res = asType<Response>({})
    const next = vi.fn() as unknown as NextFunction
    validate(z.object({ page: z.coerce.number() }), 'query')(req, res, next)
    const arg = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]
    expect(arg).toBeInstanceOf(z.ZodError)
  })
})
