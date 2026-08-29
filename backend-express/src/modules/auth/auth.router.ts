import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { authController } from './auth.controller.js'
import { RegisterSchema, LoginSchema, UpdateProfileSchema } from './auth.schema.js'

// Exported so tests can reset the counter between cases — never raise `max`,
// it is the brute-force control.
export const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20, standardHeaders: 'draft-7', legacyHeaders: false })

const router = Router()

router.post('/register', authLimiter, validate(RegisterSchema), asyncHandler(authController.register))
router.post('/login', authLimiter, validate(LoginSchema), asyncHandler(authController.login))
router.post('/refresh', authLimiter, asyncHandler(authController.refresh))
router.post('/logout', authMiddleware, asyncHandler(authController.logout))
router.get('/me', authMiddleware, asyncHandler(authController.me))
router.patch('/profile', authMiddleware, validate(UpdateProfileSchema), asyncHandler(authController.updateProfile))

export { router as authRouter }
