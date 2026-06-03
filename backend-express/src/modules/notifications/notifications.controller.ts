import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { notificationsService } from './notifications.service.js'
import type { NotificationQueryInput } from './notifications.schema.js'

function requireUserId(req: Request): string {
  const id = req.user?.id
  if (!id) throw new AppError('UNAUTHORIZED', 'Authentication required')
  return id
}

function paramId(req: Request): string {
  const id = req.params['id']
  return Array.isArray(id) ? (id[0] ?? '') : (id ?? '')
}

async function list(req: Request, res: Response): Promise<void> {
  const query = req.query as unknown as NotificationQueryInput
  const rows = await notificationsService.list(requireUserId(req), query.unreadOnly)
  res.status(200).json({ data: rows })
}

async function readAll(req: Request, res: Response): Promise<void> {
  const result = await notificationsService.markAllRead(requireUserId(req))
  res.status(200).json({ data: result })
}

async function read(req: Request, res: Response): Promise<void> {
  const notification = await notificationsService.markRead(requireUserId(req), paramId(req))
  res.status(200).json({ data: notification })
}

export const notificationsController = { list, readAll, read }
