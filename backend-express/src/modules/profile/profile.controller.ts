import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { profileService } from './profile.service.js'
import type { UpdateProfileInput } from './profile.schema.js'

function requireUserId(req: Request): string {
  const id = req.user?.id
  if (!id) throw new AppError('UNAUTHORIZED', 'Authentication required')
  return id
}

async function get(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await profileService.getForUser(requireUserId(req)) })
}

async function put(req: Request, res: Response): Promise<void> {
  const body = req.body as UpdateProfileInput
  res.status(200).json({ data: await profileService.update(requireUserId(req), body.content) })
}

export const profileController = { get, put }
