import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { coverLettersService } from './cover-letters.service.js'
import type {
  GenerateCoverLetterInput,
  UpdateCoverLetterInput,
  CoverLetterQuery,
  RefineCoverLetterInput,
} from './cover-letters.schema.js'

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
  const cl = await coverLettersService.generate(requireUserId(req), req.body as GenerateCoverLetterInput)
  res.status(201).json({ data: cl })
}
async function list(req: Request, res: Response): Promise<void> {
  const { jobId } = req.query as CoverLetterQuery
  res.status(200).json({ data: await coverLettersService.list(requireUserId(req), jobId) })
}
async function get(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await coverLettersService.get(requireUserId(req), paramValue(req, 'id')) })
}
async function update(req: Request, res: Response): Promise<void> {
  const cl = await coverLettersService.update(requireUserId(req), paramValue(req, 'id'), req.body as UpdateCoverLetterInput)
  res.status(200).json({ data: cl })
}
async function remove(req: Request, res: Response): Promise<void> {
  await coverLettersService.remove(requireUserId(req), paramValue(req, 'id'))
  res.status(204).end()
}
async function refine(req: Request, res: Response): Promise<void> {
  const out = await coverLettersService.refine(requireUserId(req), paramValue(req, 'id'), req.body as RefineCoverLetterInput)
  res.status(200).json({ data: out })
}

export const coverLettersController = { generate, list, get, update, remove, refine }
