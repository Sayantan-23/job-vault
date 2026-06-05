import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { aiController } from './ai.controller.js'

const router = Router()
router.get('/status', asyncHandler(aiController.status))

export { router as aiRouter }
