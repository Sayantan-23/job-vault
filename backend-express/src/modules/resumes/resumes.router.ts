import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { resumesController } from './resumes.controller.js'
import { GenerateResumeSchema, UpdateResumeSchema, ResumeQuerySchema } from './resumes.schema.js'

const router = Router()
router.use(authMiddleware)
router.post('/', validate(GenerateResumeSchema), asyncHandler(resumesController.generate))
router.get('/', validate(ResumeQuerySchema, 'query'), asyncHandler(resumesController.list))
router.get('/:id/tex', asyncHandler(resumesController.tex))
router.get('/:id', asyncHandler(resumesController.get))
router.patch('/:id', validate(UpdateResumeSchema), asyncHandler(resumesController.update))
router.delete('/:id', asyncHandler(resumesController.remove))

export { router as resumesRouter }
