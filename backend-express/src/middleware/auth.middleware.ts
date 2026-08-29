import type { Request, Response, NextFunction, RequestHandler } from 'express'
import { AppError } from '@/shared/errors.js'
import { verifyToken } from '@/modules/auth/auth.tokens.js'

export const authMiddleware: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  // Web sends the HTTP-only cookie; native clients have no cookie jar and send
  // `Authorization: Bearer <accessToken>` instead (d-0cc1x6).
  const bearer = /^Bearer (.+)$/i.exec(req.headers?.authorization ?? '')?.[1]
  const token = bearer ?? (req.cookies?.['accessToken'] as string | undefined)
  if (!token) {
    next(new AppError('UNAUTHORIZED', 'Authentication required'))
    return
  }
  try {
    const payload = verifyToken(token)
    req.user = { id: payload.sub, email: payload.email ?? '' }
    next()
  } catch (err) {
    next(new AppError('UNAUTHORIZED', 'Invalid or expired token', err))
  }
}
