import type { Request, Response } from 'express'
import { AppError } from '@/shared/errors.js'
import { extensionService } from './extension.service.js'
import type { QuickCreateJobInput, CheckUrlInput } from './extension.schema.js'
import type { ScrapeUrlInput } from '@/modules/jobs/jobs.schema.js'

// The api-key principal (set by apiKeyMiddleware), not a cookie user.
function requireApiUserId(req: Request): string {
  const id = req.apiKey?.userId
  if (!id) throw new AppError('UNAUTHORIZED', 'API key required')
  return id
}

async function verifyKey(req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: await extensionService.verifyKey(requireApiUserId(req)) })
}
async function checkUrl(req: Request, res: Response): Promise<void> {
  const { url } = req.query as CheckUrlInput
  res.status(200).json({ data: await extensionService.checkUrl(requireApiUserId(req), url) })
}
async function quickCreate(req: Request, res: Response): Promise<void> {
  const data = await extensionService.quickCreateJob(requireApiUserId(req), req.body as QuickCreateJobInput)
  res.status(201).json({ data })
}
async function scrape(req: Request, res: Response): Promise<void> {
  const { sourceUrl } = req.body as ScrapeUrlInput
  res.status(200).json({ data: await extensionService.scrape(requireApiUserId(req), sourceUrl) })
}

export const extensionController = { verifyKey, checkUrl, quickCreate, scrape }
