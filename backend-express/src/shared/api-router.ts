import { Router } from 'express'
import { healthRouter } from '@/modules/health/health.router.js'
import { authRouter } from '@/modules/auth/auth.router.js'
import { jobsRouter } from '@/modules/jobs/jobs.router.js'
import { dashboardRouter } from '@/modules/dashboard/dashboard.router.js'
import { timelineRouter } from '@/modules/timeline/timeline.router.js'
import { notificationsRouter } from '@/modules/notifications/notifications.router.js'

const router = Router()

router.use('/health', healthRouter)
router.use('/auth', authRouter)
router.use('/jobs', jobsRouter)
router.use('/jobs/:jobId/timeline', timelineRouter)
router.use('/dashboard', dashboardRouter)
router.use('/notifications', notificationsRouter)

export { router as apiRouter }
