import { Router } from 'express'
import { asyncHandler } from '@/shared/async-handler.js'
import { validate } from '@/middleware/validate.middleware.js'
import { authMiddleware } from '@/middleware/auth.middleware.js'
import { searchController } from './search.controller.js'
import { SearchQuerySchema } from './search.schema.js'

const router = Router()
router.use(authMiddleware)
router.get('/', validate(SearchQuerySchema, 'query'), asyncHandler(searchController.search))

export { router as searchRouter }
