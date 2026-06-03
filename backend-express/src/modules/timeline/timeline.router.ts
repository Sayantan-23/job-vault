import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { timelineController } from './timeline.controller.js'
import { CreateTimelineEntrySchema } from './timeline.schema.js'

// mergeParams lets this router read `:jobId` from the mount path in api-router.
const router = Router({ mergeParams: true })

router.use(authMiddleware)

router.get('/', asyncHandler(timelineController.list))
router.post('/', validate(CreateTimelineEntrySchema), asyncHandler(timelineController.create))

export { router as timelineRouter }
