import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { dashboardService } from './dashboard.service.js'
import type { DashboardQueryInput } from './dashboard.schema.js'

function requireUserId(req: Request): string {
  const id = req.user?.id
  if (!id) throw new AppError('UNAUTHORIZED', 'Authentication required')
  return id
}

async function kanban(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as DashboardQueryInput
  const board = await dashboardService.getKanban(requireUserId(req), query)
  res.status(200).json({ data: board })
}

async function stats(req: Request, res: Response): Promise<void> {
  const result = await dashboardService.getStats(requireUserId(req))
  res.status(200).json({ data: result })
}

export const dashboardController = { kanban, stats }
