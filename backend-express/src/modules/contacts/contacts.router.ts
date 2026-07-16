import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { contactsController } from './contacts.controller.js'
import { CreateContactSchema, UpdateContactSchema } from './contacts.schema.js'

// Mounted at '/jobs/:jobId/contacts' — mergeParams exposes :jobId to handlers.
const jobRouter = Router({ mergeParams: true })
jobRouter.use(authMiddleware)
jobRouter.get('/', asyncHandler(contactsController.list))
jobRouter.post('/', validate(CreateContactSchema), asyncHandler(contactsController.create))

// Mounted at '/contacts' — :id update/delete.
const idRouter = Router()
idRouter.use(authMiddleware)
idRouter.patch('/:id', validate(UpdateContactSchema), asyncHandler(contactsController.update))
idRouter.delete('/:id', asyncHandler(contactsController.remove))

export { jobRouter as contactsJobRouter, idRouter as contactsRouter }
