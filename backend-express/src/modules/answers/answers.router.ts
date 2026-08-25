import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { answersController } from './answers.controller.js'
import { CreateAnswerSchema, UpdateAnswerSchema, GenerateAnswerSchema } from './answers.schema.js'

const router = Router()
router.use(authMiddleware)
// '/generate' is declared before the '/:id' routes so it is never swallowed as an id.
router.post('/generate', validate(GenerateAnswerSchema), asyncHandler(answersController.generate))
router.get('/', asyncHandler(answersController.list))
router.post('/', validate(CreateAnswerSchema), asyncHandler(answersController.create))
router.patch('/:id', validate(UpdateAnswerSchema), asyncHandler(answersController.update))
router.delete('/:id', asyncHandler(answersController.remove))
router.post('/:id/used', asyncHandler(answersController.markUsed))

export { router as answersRouter }
