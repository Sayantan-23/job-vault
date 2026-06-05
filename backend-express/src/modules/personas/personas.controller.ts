import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { personasService } from './personas.service.js'
import type { CreatePersonaInput, UpdatePersonaInput } from './personas.schema.js'

function requireUserId(req: Request): string {
  const id = req.user?.id
  if (!id) throw new AppError('UNAUTHORIZED', 'Authentication required')
  return id
}

function paramValue(req: Request, key: string): string {
  const value = req.params[key]
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

async function list(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await personasService.list(requireUserId(req)) })
}

async function get(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await personasService.get(requireUserId(req), paramValue(req, 'id')) })
}

async function create(req: Request, res: Response): Promise<void> {
  const persona = await personasService.create(requireUserId(req), req.body as CreatePersonaInput)
  res.status(201).json({ data: persona })
}

async function update(req: Request, res: Response): Promise<void> {
  const persona = await personasService.update(requireUserId(req), paramValue(req, 'id'), req.body as UpdatePersonaInput)
  res.status(200).json({ data: persona })
}

async function remove(req: Request, res: Response): Promise<void> {
  await personasService.remove(requireUserId(req), paramValue(req, 'id'))
  res.status(204).end()
}

export const personasController = { list, get, create, update, remove }
