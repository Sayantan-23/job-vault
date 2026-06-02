import { Router } from 'express'
import { healthRouter } from '@/modules/health/health.router.js'
import { authRouter } from '@/modules/auth/auth.router.js'
import { jobsRouter } from '@/modules/jobs/jobs.router.js'

const router = Router()

router.use('/health', healthRouter)
router.use('/auth', authRouter)
router.use('/jobs', jobsRouter)

export { router as apiRouter }
