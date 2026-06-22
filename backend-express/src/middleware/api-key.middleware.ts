import type { RequestHandler } from 'express'
import { AppError } from '@/shared/errors.js'
import { apiKeysService } from '@/modules/api-keys/api-keys.service.js'

// Authenticates extension runtime calls via the `X-API-Key` header (NOT cookies —
// the extension is a third-party origin, so SameSite=Lax cookies never reach it).
// On success sets `req.apiKey = { id, userId }` for downstream controllers.
export const apiKeyMiddleware: RequestHandler = (req, _res, next) => {
  const raw = req.header('x-api-key')
  if (!raw) {
    next(new AppError('UNAUTHORIZED', 'API key required'))
    return
  }
  apiKeysService
    .verifyRawKey(raw)
    .then((result) => {
      if (!result) {
        next(new AppError('UNAUTHORIZED', 'Invalid API key'))
        return
      }
      req.apiKey = result
      next()
    })
    .catch(next)
}
