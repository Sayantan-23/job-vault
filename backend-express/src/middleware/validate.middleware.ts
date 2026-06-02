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
    // Express 5, so mutate them in place instead of reassigning.
    if (source === 'body') {
      req.body = result.data
    } else {
      Object.assign(req[source], result.data)
    }
    next()
  }
