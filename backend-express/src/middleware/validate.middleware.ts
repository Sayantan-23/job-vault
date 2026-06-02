import type { Request, Response, NextFunction, RequestHandler } from 'express'
import type { z } from 'zod'

type Source = 'body' | 'query' | 'params'

export const validate =
  <T extends z.ZodTypeAny>(schema: T, source: Source = 'body'): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      next(result.error)
      return
    }
    // `req.body` is writable; `req.query`/`req.params` are read-only getters in
    // Express 5 whose returned object swallows mutations, so redefine the
    // property on the request with the parsed (coerced + defaulted) value.
    if (source === 'body') {
      req.body = result.data
    } else {
      Object.defineProperty(req, source, {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      })
    }
    next()
  }
