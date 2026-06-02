import { describe, it, expect } from 'vitest'
import {
  CreateJobSchema,
  UpdateJobSchema,
  MoveJobSchema,
  ScrapeUrlSchema,
  JobQuerySchema,
} from './jobs.schema.js'

describe('CreateJobSchema', () => {
  it('accepts a minimal valid job', () => {
    const r = CreateJobSchema.safeParse({ title: 'SWE', company: 'Acme' })
    expect(r.success).toBe(true)
  })
  it('rejects a missing title', () => {
    expect(CreateJobSchema.safeParse({ company: 'Acme' }).success).toBe(false)
  })
  it('rejects an invalid sourceUrl', () => {
    expect(CreateJobSchema.safeParse({ title: 'a', company: 'b', sourceUrl: 'not-a-url' }).success).toBe(false)
  })
  it('rejects an unknown status', () => {
    expect(CreateJobSchema.safeParse({ title: 'a', company: 'b', status: 'NOPE' }).success).toBe(false)
  })
})

describe('UpdateJobSchema', () => {
  it('allows an empty patch', () => {
    expect(UpdateJobSchema.safeParse({}).success).toBe(true)
  })
})

describe('MoveJobSchema', () => {
  it('requires status and kanbanOrder', () => {
    expect(MoveJobSchema.safeParse({ status: 'APPLIED', kanbanOrder: 2 }).success).toBe(true)
    expect(MoveJobSchema.safeParse({ status: 'APPLIED' }).success).toBe(false)
  })
})

describe('ScrapeUrlSchema', () => {
  it('requires a valid URL', () => {
    expect(ScrapeUrlSchema.safeParse({ sourceUrl: 'https://x.com/j' }).success).toBe(true)
    expect(ScrapeUrlSchema.safeParse({ sourceUrl: 'x' }).success).toBe(false)
  })
})

describe('JobQuerySchema', () => {
  it('applies defaults and coerces page/limit from strings', () => {
    const r = JobQuerySchema.parse({ page: '2', limit: '10' })
    expect(r.page).toBe(2)
    expect(r.limit).toBe(10)
    expect(r.sortBy).toBe('createdAt')
    expect(r.sortOrder).toBe('desc')
  })
  it('rejects limit over 100', () => {
    expect(JobQuerySchema.safeParse({ limit: '101' }).success).toBe(false)
  })
  it('accepts a ghostFilter', () => {
    expect(JobQuerySchema.parse({ ghostFilter: 'stale' }).ghostFilter).toBe('stale')
  })
})
