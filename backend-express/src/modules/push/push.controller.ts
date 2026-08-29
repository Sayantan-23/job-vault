import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { pushService } from './push.service.js'
import type { RegisterDeviceInput } from './push.schema.js'

function requireUserId(req: Request): string {
  const id = req.user?.id
  if (!id) throw new AppError('UNAUTHORIZED', 'Authentication required')
  return id
}
function paramValue(req: Request, key: string): string {
  const v = req.params[key]
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
}

async function register(req: Request, res: Response): Promise<void> {
  const input = req.body as RegisterDeviceInput
  res.status(201).json({ data: await pushService.registerDevice(requireUserId(req), input) })
}

async function unregister(req: Request, res: Response): Promise<void> {
  await pushService.unregisterDevice(requireUserId(req), paramValue(req, 'token'))
  res.status(204).end()
}

export const pushController = { register, unregister }
