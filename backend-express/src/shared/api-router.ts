import { Router } from 'express'
import { healthRouter } from '@/modules/health/health.router.js'
import { authRouter } from '@/modules/auth/auth.router.js'
import { jobsRouter } from '@/modules/jobs/jobs.router.js'
import { dashboardRouter } from '@/modules/dashboard/dashboard.router.js'
import { timelineRouter } from '@/modules/timeline/timeline.router.js'
import { notificationsRouter } from '@/modules/notifications/notifications.router.js'
import { remindersJobRouter, remindersRouter } from '@/modules/reminders/reminders.router.js'
import { aiRouter } from '@/modules/ai/ai.router.js'
import { personasRouter } from '@/modules/personas/personas.router.js'
import { resumesRouter } from '@/modules/resumes/resumes.router.js'
import { coverLettersRouter } from '@/modules/cover-letters/cover-letters.router.js'

const router = Router()

router.use('/health', healthRouter)
router.use('/auth', authRouter)
router.use('/jobs', jobsRouter)
router.use('/jobs/:jobId/timeline', timelineRouter)
// The job-scoped reminders sub-router (and the 4a '/jobs/:jobId/timeline'
// sub-router) coexist with the '/jobs' jobsRouter above: jobsRouter's '/:id'
// routes only match a single path segment, so a deeper path like
// '/jobs/<id>/reminders' falls through to the mount registered here.
router.use('/jobs/:jobId/reminders', remindersJobRouter)
router.use('/reminders', remindersRouter)
router.use('/dashboard', dashboardRouter)
router.use('/notifications', notificationsRouter)
router.use('/ai', aiRouter)
router.use('/personas', personasRouter)
router.use('/resumes', resumesRouter)
router.use('/cover-letters', coverLettersRouter)

export { router as apiRouter }
