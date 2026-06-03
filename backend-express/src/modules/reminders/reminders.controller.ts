import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { remindersService } from './reminders.service.js'
import type { CreateReminderInput, UpdateReminderInput } from './reminders.schema.js'

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
  const rows = await remindersService.listForJob(requireUserId(req), paramValue(req, 'jobId'))
  res.status(200).json({ data: rows })
}

async function create(req: Request, res: Response): Promise<void> {
  const reminder = await remindersService.create(requireUserId(req), paramValue(req, 'jobId'), req.body as CreateReminderInput)
  res.status(201).json({ data: reminder })
}

async function update(req: Request, res: Response): Promise<void> {
  const reminder = await remindersService.update(requireUserId(req), paramValue(req, 'id'), req.body as UpdateReminderInput)
  res.status(200).json({ data: reminder })
}

async function remove(req: Request, res: Response): Promise<void> {
  const result = await remindersService.remove(requireUserId(req), paramValue(req, 'id'))
  res.status(200).json({ data: result })
}

export const remindersController = { list, create, update, remove }
