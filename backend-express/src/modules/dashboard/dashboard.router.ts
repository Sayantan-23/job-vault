import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { dashboardController } from './dashboard.controller.js'
import { DashboardQuerySchema } from './dashboard.schema.js'

const router = Router()

router.use(authMiddleware)
router.get('/kanban', validate(DashboardQuerySchema, 'query'), asyncHandler(dashboardController.kanban))
router.get('/stats', asyncHandler(dashboardController.stats))

export { router as dashboardRouter }
