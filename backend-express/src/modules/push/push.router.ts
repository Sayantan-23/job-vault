import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { pushController } from './push.controller.js'
import { RegisterDeviceSchema } from './push.schema.js'

const router = Router()

router.use(authMiddleware)

// The mobile app posts its Expo token here on every launch (registration is an
// upsert, so re-posting an unchanged token is a no-op) and deletes it on logout.
router.post('/devices', validate(RegisterDeviceSchema), asyncHandler(pushController.register))
router.delete('/devices/:token', asyncHandler(pushController.unregister))

export { router as pushRouter }
