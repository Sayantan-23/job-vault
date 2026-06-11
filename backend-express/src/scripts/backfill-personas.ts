import 'dotenv/config'
import { pathToFileURL } from 'node:url'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@/db/client.js'
import { personas } from '@/db/schema/personas.js'
import { logger } from '@/shared/logger.js'
import { isLegacyResumeContent, normalizePersonaData } from '@/shared/resume-to-profile.js'

// One-off backfill: rewrite legacy ResumeContent persona payloads as
// ProfileContent (Slice 7b). Reads RAW rows — not the repository, which
// normalizes on read and would hide the legacy shape — so a second run finds
// nothing legacy and converts 0 (idempotent). Conversion reuses
// normalizePersonaData so the script accepts exactly what the lazy read path
// accepts (including its misleading-marker fallback); a row that still fails
// is logged with its persona id and skipped so one bad row never aborts the run.
export async function backfillPersonas(): Promise<{ converted: number; skipped: number; total: number }> {
  const db = getDb()
  const rows = await db.select().from(personas)

  let converted = 0
  let skipped = 0
  for (const row of rows) {
    if (!isLegacyResumeContent(row.data)) continue
    try {
      const data = normalizePersonaData(row.data)
      await db.update(personas).set({ data }).where(eq(personas.id, row.id))
      converted += 1
    } catch (err) {
      skipped += 1
      logger.error({ err, personaId: row.id }, 'persona backfill: row failed, skipping')
    }
  }

  logger.info(`converted ${converted} and skipped ${skipped} of ${rows.length} personas`)
  return { converted, skipped, total: rows.length }
}

// Importable for tests; the runner below executes only when invoked directly
// (npm run db:backfill-personas).
const isDirectRun = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectRun) {
  try {
    const { skipped } = await backfillPersonas()
    if (skipped > 0) process.exitCode = 1
  } catch (err) {
    logger.error({ err }, 'persona backfill failed')
    process.exitCode = 1
  } finally {
    await closeDb()
  }
}
