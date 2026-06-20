import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { apiKeysService } from './api-keys.service.js'
import type { CreateApiKeyInput } from './api-keys.schema.js'

function requireUserId(req: Request): string {
  const id = req.user?.id
  if (!id) throw new AppError('UNAUTHORIZED', 'Authentication required')
  return id
}
function paramValue(req: Request, key: string): string {
  const v = req.params[key]
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
}

async function create(req: Request, res: Response): Promise<void> {
  const { name } = req.body as CreateApiKeyInput
  // 201 body carries `rawKey` — the only time the secret is ever returned.
  res.status(201).json({ data: await apiKeysService.createKey(requireUserId(req), name) })
}
async function list(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await apiKeysService.list(requireUserId(req)) })
}
async function remove(req: Request, res: Response): Promise<void> {
  await apiKeysService.revoke(requireUserId(req), paramValue(req, 'id'))
  res.status(204).end()
}

export const apiKeysController = { create, list, remove }
