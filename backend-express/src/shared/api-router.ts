import { Router } from 'express'
import { healthRouter } from '@/modules/health/health.router.js'
import { authRouter } from '@/modules/auth/auth.router.js'
import { jobsRouter } from '@/modules/jobs/jobs.router.js'
import { dashboardRouter } from '@/modules/dashboard/dashboard.router.js'

const router = Router()

router.use('/health', healthRouter)
router.use('/auth', authRouter)
router.use('/jobs', jobsRouter)
router.use('/dashboard', dashboardRouter)

export { router as apiRouter }
