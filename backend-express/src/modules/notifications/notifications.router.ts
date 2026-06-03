import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { notificationsController } from './notifications.controller.js'
import { NotificationQuerySchema } from './notifications.schema.js'

const router = Router()

router.use(authMiddleware)

router.get('/', validate(NotificationQuerySchema, 'query'), asyncHandler(notificationsController.list))
// Declared BEFORE '/:id/read' so Express never captures 'read-all' as :id.
router.patch('/read-all', asyncHandler(notificationsController.readAll))
router.patch('/:id/read', asyncHandler(notificationsController.read))

export { router as notificationsRouter }
