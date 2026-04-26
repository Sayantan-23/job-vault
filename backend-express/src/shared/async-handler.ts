import type { Request, Response, NextFunction, RequestHandler } from 'express'

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => unknown

export const asyncHandler =
  (fn: AsyncRequestHandler): RequestHandler =>
  (req, res, next) =>
    // Wrapping in Promise.resolve().then() ensures synchronous throws are also caught.
    // The returned Promise is used by tests; Express itself ignores the return value.
    Promise.resolve()
      .then(() => fn(req, res, next))
      .catch(next) as unknown as void
