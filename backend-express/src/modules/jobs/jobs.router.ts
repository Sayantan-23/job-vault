import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { jobsController } from './jobs.controller.js'
import { CreateJobSchema, UpdateJobSchema, MoveJobSchema, ScrapeUrlSchema, JobQuerySchema } from './jobs.schema.js'

const router = Router()

// All job routes require authentication.
router.use(authMiddleware)

router.get('/', validate(JobQuerySchema, 'query'), asyncHandler(jobsController.list))
router.post('/', validate(CreateJobSchema), asyncHandler(jobsController.create))
router.post('/scrape', validate(ScrapeUrlSchema), asyncHandler(jobsController.scrape))
router.get('/:id', asyncHandler(jobsController.get))
router.patch('/:id', validate(UpdateJobSchema), asyncHandler(jobsController.update))
router.patch('/:id/move', validate(MoveJobSchema), asyncHandler(jobsController.move))
router.delete('/:id', asyncHandler(jobsController.remove))

export { router as jobsRouter }
