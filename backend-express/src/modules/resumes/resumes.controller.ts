import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { resumesService } from './resumes.service.js'
import type { GenerateResumeInput, UpdateResumeInput, ResumeQuery } from './resumes.schema.js'

function requireUserId(req: Request): string {
  const id = req.user?.id
  if (!id) throw new AppError('UNAUTHORIZED', 'Authentication required')
  return id
}
function paramValue(req: Request, key: string): string {
  const v = req.params[key]
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
}

async function generate(req: Request, res: Response): Promise<void> {
  const r = await resumesService.generate(requireUserId(req), req.body as GenerateResumeInput)
  res.status(201).json({ data: r })
}
async function list(req: Request, res: Response): Promise<void> {
  const { jobId } = req.query as ResumeQuery
  res.status(200).json({ data: await resumesService.list(requireUserId(req), jobId) })
}
async function get(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await resumesService.get(requireUserId(req), paramValue(req, 'id')) })
}
async function tex(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: { tex: await resumesService.getTex(requireUserId(req), paramValue(req, 'id')) } })
}
async function update(req: Request, res: Response): Promise<void> {
  const r = await resumesService.update(requireUserId(req), paramValue(req, 'id'), req.body as UpdateResumeInput)
  res.status(200).json({ data: r })
}
async function remove(req: Request, res: Response): Promise<void> {
  await resumesService.remove(requireUserId(req), paramValue(req, 'id'))
  res.status(204).end()
}

export const resumesController = { generate, list, get, tex, update, remove }
