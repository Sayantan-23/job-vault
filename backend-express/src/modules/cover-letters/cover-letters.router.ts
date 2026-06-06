import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { coverLettersController } from './cover-letters.controller.js'
import { GenerateCoverLetterSchema, UpdateCoverLetterSchema, CoverLetterQuerySchema } from './cover-letters.schema.js'

const router = Router()
router.use(authMiddleware)
router.post('/', validate(GenerateCoverLetterSchema), asyncHandler(coverLettersController.generate))
router.get('/', validate(CoverLetterQuerySchema, 'query'), asyncHandler(coverLettersController.list))
router.get('/:id', asyncHandler(coverLettersController.get))
router.patch('/:id', validate(UpdateCoverLetterSchema), asyncHandler(coverLettersController.update))
router.delete('/:id', asyncHandler(coverLettersController.remove))

export { router as coverLettersRouter }
