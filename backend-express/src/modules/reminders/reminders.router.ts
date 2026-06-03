import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { remindersController } from './reminders.controller.js'
import { CreateReminderSchema, UpdateReminderSchema } from './reminders.schema.js'

// Mounted at '/jobs/:jobId/reminders' — mergeParams exposes :jobId to handlers.
const jobRouter = Router({ mergeParams: true })
jobRouter.use(authMiddleware)
jobRouter.get('/', asyncHandler(remindersController.list))
jobRouter.post('/', validate(CreateReminderSchema), asyncHandler(remindersController.create))

// Mounted at '/reminders' — :id update/delete.
const idRouter = Router()
idRouter.use(authMiddleware)
idRouter.patch('/:id', validate(UpdateReminderSchema), asyncHandler(remindersController.update))
idRouter.delete('/:id', asyncHandler(remindersController.remove))

export { jobRouter as remindersJobRouter, idRouter as remindersRouter }
