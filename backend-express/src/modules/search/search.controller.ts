import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { searchService } from './search.service.js'
import type { SearchQueryInput } from './search.schema.js'

function requireUserId(req: Request): string {
  const id = req.user?.id
  if (!id) throw new AppError('UNAUTHORIZED', 'Authentication required')
  return id
}

async function search(req: Request, res: Response): Promise<void> {
  const { q } = req.query as unknown as SearchQueryInput
  res.status(200).json({ data: await searchService.search(requireUserId(req), q) })
}

export const searchController = { search }
