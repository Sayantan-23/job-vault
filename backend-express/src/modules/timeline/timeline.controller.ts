import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { timelineService } from './timeline.service.js'
import type { CreateTimelineEntryInput, TimelineQueryInput } from './timeline.schema.js'

function requireUserId(req: Request): string {
  const id = req.user?.id
  if (!id) throw new AppError('UNAUTHORIZED', 'Authentication required')
  return id
}

// Express 5's params type widens to `string | string[]`; a single `:jobId` route
// param is always a single string at runtime, so normalize it to one.
function paramJobId(req: Request): string {
  const id = req.params['jobId']
  return Array.isArray(id) ? (id[0] ?? '') : (id ?? '')
}

async function list(req: Request, res: Response): Promise<void> {
  const rows = await timelineService.list(requireUserId(req), paramJobId(req))
  res.status(200).json({ data: rows })
}

// GET /api/timeline — the user-scoped global feed (paginated, all jobs).
async function listGlobal(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as TimelineQueryInput
  const { rows, total, page, limit } = await timelineService.listForUser(requireUserId(req), query)
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0
  res.status(200).json({ data: rows, meta: { total, page, limit, totalPages } })
}

async function create(req: Request, res: Response): Promise<void> {
  const event = await timelineService.addManualEntry(
    requireUserId(req),
    paramJobId(req),
    req.body as CreateTimelineEntryInput,
  )
  res.status(201).json({ data: event })
}

export const timelineController = { list, listGlobal, create }
