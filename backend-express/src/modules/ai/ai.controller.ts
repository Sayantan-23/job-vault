import type { Request, Response } from 'express'
import { getEnv } from '@/config/env.js'
import { geminiService } from './gemini.service.js'

async function status(_req: Request, res: Response): Promise<void> {
  res.status(200).json({ data: { enabled: geminiService.isAiEnabled(), maxPersonas: getEnv().MAX_PERSONAS } })
}

export const aiController = { status }
