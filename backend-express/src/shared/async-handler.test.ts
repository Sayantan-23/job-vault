import { describe, it, expect, vi } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { asyncHandler } from './async-handler.js'

function makeReqRes(): { req: Request; res: Response; next: NextFunction } {
  const req = {} as Request
  const res = {} as Response
  const next = vi.fn() as unknown as NextFunction
  return { req, res, next }
}

describe('asyncHandler', () => {
  it('invokes next(err) when the handler rejects', async () => {
    const { req, res, next } = makeReqRes()
    const failing = asyncHandler(async () => {
      throw new Error('boom')
    })
    await failing(req, res, next)
    expect(next).toHaveBeenCalledOnce()
    const arg = (next as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]
    expect(arg).toBeInstanceOf(Error)
    expect((arg as Error).message).toBe('boom')
  })

  it('does not call next when the handler resolves', async () => {
    const { req, res, next } = makeReqRes()
    const ok = asyncHandler(async () => {
      // no-op
    })
    await ok(req, res, next)
    expect(next).not.toHaveBeenCalled()
  })

  it('also works for synchronous throws', async () => {
    const { req, res, next } = makeReqRes()
    const sync = asyncHandler(() => {
      throw new Error('sync-boom')
    })
    await sync(req, res, next)
    expect(next).toHaveBeenCalledOnce()
  })
})
