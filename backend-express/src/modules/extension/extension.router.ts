import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { apiKeyMiddleware } from '@/middleware/api-key.middleware.js'
import { extensionController } from './extension.controller.js'
import { QuickCreateJobSchema, CheckUrlSchema } from './extension.schema.js'
import { ScrapeUrlSchema } from '@/modules/jobs/jobs.schema.js'

// Public-facing runtime: cap per-IP well above normal use but low enough to blunt
// abuse. Stacks on top of the global /api limiter.
const extensionLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
})

const router = Router()
router.use(apiKeyMiddleware)
router.use(extensionLimiter)
router.post('/verify-key', asyncHandler(extensionController.verifyKey))
router.get('/check-url', validate(CheckUrlSchema, 'query'), asyncHandler(extensionController.checkUrl))
router.post('/jobs', validate(QuickCreateJobSchema), asyncHandler(extensionController.quickCreate))
router.post('/scrape', validate(ScrapeUrlSchema), asyncHandler(extensionController.scrape))
router.get('/answers', asyncHandler(extensionController.listAnswers))
router.post('/answers/:id/used', asyncHandler(extensionController.markAnswerUsed))

export { router as extensionRouter }
