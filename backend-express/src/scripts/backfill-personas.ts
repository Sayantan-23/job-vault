import 'dotenv/config'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { personas } from '@/db/schema/personas.js'
import { logger } from '@/shared/logger.js'
import { ResumeContentSchema } from '@/shared/resume-content.schema.js'
import {
  isLegacyResumeContent,
  resumeContentToProfileContent,
} from '@/shared/resume-to-profile.js'

// One-off backfill: rewrite legacy ResumeContent persona payloads as
// ProfileContent (Slice 7b). Reads RAW rows — not the repository, which
// normalizes on read and would hide the legacy shape — so a second run finds
// nothing legacy and converts 0 (idempotent).
async function backfillPersonas(): Promise<void> {
  const db = getDb()
  const rows = await db.select().from(personas)

  let converted = 0
  for (const row of rows) {
    if (!isLegacyResumeContent(row.data)) continue
    const data = resumeContentToProfileContent(ResumeContentSchema.parse(row.data))
    await db.update(personas).set({ data }).where(eq(personas.id, row.id))
    converted += 1
  }

  logger.info(`converted ${converted} of ${rows.length} personas`)
}

try {
  await backfillPersonas()
} catch (err) {
  logger.error({ err }, 'persona backfill failed')
  process.exitCode = 1
} finally {
  await closeDb()
}
