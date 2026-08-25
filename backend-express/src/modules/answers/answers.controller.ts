import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { answersService } from './answers.service.js'
import type { CreateAnswerInput, UpdateAnswerInput, GenerateAnswerInput } from './answers.schema.js'

function requireUserId(req: Request): string {
  const id = req.user?.id
  if (!id) throw new AppError('UNAUTHORIZED', 'Authentication required')
  return id
}
function paramValue(req: Request, key: string): string {
  const v = req.params[key]
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
}

async function list(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await answersService.list(requireUserId(req)) })
}
async function create(req: Request, res: Response): Promise<void> {
  const answer = await answersService.create(requireUserId(req), req.body as CreateAnswerInput)
  res.status(201).json({ data: answer })
}
async function update(req: Request, res: Response): Promise<void> {
  const answer = await answersService.update(requireUserId(req), paramValue(req, 'id'), req.body as UpdateAnswerInput)
  res.status(200).json({ data: answer })
}
async function remove(req: Request, res: Response): Promise<void> {
  await answersService.remove(requireUserId(req), paramValue(req, 'id'))
  res.status(204).end()
}
async function markUsed(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await answersService.markUsed(requireUserId(req), paramValue(req, 'id')) })
}
async function generate(req: Request, res: Response): Promise<void> {
  // 200, not 201 — this creates nothing. The draft is a candidate the user
  // saves through POST / if they want it.
  res.status(200).json({ data: await answersService.generate(requireUserId(req), req.body as GenerateAnswerInput) })
}

export const answersController = { list, create, update, remove, markUsed, generate }
