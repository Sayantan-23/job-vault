import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { profileController } from './profile.controller.js'
import { UpdateProfileSchema } from './profile.schema.js'

const router = Router()
router.use(authMiddleware)
router.get('/', asyncHandler(profileController.get))
router.put('/', validate(UpdateProfileSchema), asyncHandler(profileController.put))

export { router as profileRouter }
