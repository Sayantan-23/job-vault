import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { contactsService } from './contacts.service.js'
import type { CreateContactInput, UpdateContactInput } from './contacts.schema.js'

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
  const rows = await contactsService.listForJob(requireUserId(req), paramValue(req, 'jobId'))
  res.status(200).json({ data: rows })
}

async function create(req: Request, res: Response): Promise<void> {
  const contact = await contactsService.create(
    requireUserId(req),
    paramValue(req, 'jobId'),
    req.body as CreateContactInput,
  )
  res.status(201).json({ data: contact })
}

async function update(req: Request, res: Response): Promise<void> {
  const contact = await contactsService.update(requireUserId(req), paramValue(req, 'id'), req.body as UpdateContactInput)
  res.status(200).json({ data: contact })
}

async function remove(req: Request, res: Response): Promise<void> {
  const result = await contactsService.remove(requireUserId(req), paramValue(req, 'id'))
  res.status(200).json({ data: result })
}

export const contactsController = { list, create, update, remove }
