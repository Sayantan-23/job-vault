import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { jobsService } from './jobs.service.js'
import type { CreateJobInput, UpdateJobInput, MoveJobInput, JobQueryInput } from './jobs.schema.js'

function requireUserId(req: Request): string {
  const id = req.user?.id
  if (!id) throw new AppError('UNAUTHORIZED', 'Authentication required')
  return id
}

// Express 5's params type widens to `string | string[]`; a single `:id` route
// param is always a single string at runtime, so normalize it to one.
function paramId(req: Request): string {
  const id = req.params['id']
  return Array.isArray(id) ? (id[0] ?? '') : (id ?? '')
}

async function list(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as JobQueryInput
  const { rows, total, page, limit } = await jobsService.list(requireUserId(req), query)
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0
  res.status(200).json({ data: rows, meta: { total, page, limit, totalPages } })
}

async function create(req: Request, res: Response): Promise<void> {
  const job = await jobsService.create(requireUserId(req), req.body as CreateJobInput)
  res.status(201).json({ data: job })
}

async function scrape(req: Request, res: Response): Promise<void> {
  const { sourceUrl } = req.body as { sourceUrl: string }
  const result = await jobsService.scrape(sourceUrl)
  res.status(200).json({ data: result })
}

async function get(req: Request, res: Response): Promise<void> {
  const job = await jobsService.get(requireUserId(req), paramId(req))
  res.status(200).json({ data: job })
}

async function update(req: Request, res: Response): Promise<void> {
  const job = await jobsService.update(requireUserId(req), paramId(req), req.body as UpdateJobInput)
  res.status(200).json({ data: job })
}

async function move(req: Request, res: Response): Promise<void> {
  const job = await jobsService.move(requireUserId(req), paramId(req), req.body as MoveJobInput)
  res.status(200).json({ data: job })
}

async function remove(req: Request, res: Response): Promise<void> {
  await jobsService.remove(requireUserId(req), paramId(req))
  res.status(200).json({ data: { message: 'Job deleted successfully' } })
}

export const jobsController = { list, create, scrape, get, update, move, remove }
