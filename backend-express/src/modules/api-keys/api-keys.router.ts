import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { apiKeysController } from './api-keys.controller.js'
import { CreateApiKeySchema } from './api-keys.schema.js'

// Minting a key is privileged + first-party (cookie-authed). Cap it tighter than
// the global limiter so a stolen session can't spray keys.
const createLimiter = rateLimit({
  windowMs: 15 * 60_000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
})

const router = Router()
router.use(authMiddleware)
router.post('/', createLimiter, validate(CreateApiKeySchema), asyncHandler(apiKeysController.create))
router.get('/', asyncHandler(apiKeysController.list))
router.delete('/:id', asyncHandler(apiKeysController.remove))

export { router as apiKeysRouter }
