import { describe, it, expect } from 'vitest'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { resumeParseEvents } from './resume-parse-events.js'

describe('resume_parse_events table', () => {
  it('has the expected columns', () => {
    const cols = getTableConfig(resumeParseEvents).columns.map((c) => c.name)
    expect(cols).toEqual(expect.arrayContaining(['id', 'user_id', 'created_at']))
  })

  it('indexes user_id', () => {
    const names = getTableConfig(resumeParseEvents).indexes.map((i) => i.config.name)
    expect(names).toContain('idx_resume_parse_events_user_id')
  })
})
