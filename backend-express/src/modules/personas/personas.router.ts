import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { personasController } from './personas.controller.js'
import { CreatePersonaSchema, UpdatePersonaSchema } from './personas.schema.js'

const router = Router()
router.use(authMiddleware)
router.get('/', asyncHandler(personasController.list))
router.post('/', validate(CreatePersonaSchema), asyncHandler(personasController.create))
router.get('/:id', asyncHandler(personasController.get))
router.patch('/:id', validate(UpdatePersonaSchema), asyncHandler(personasController.update))
router.delete('/:id', asyncHandler(personasController.remove))

export { router as personasRouter }
