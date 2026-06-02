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
})
