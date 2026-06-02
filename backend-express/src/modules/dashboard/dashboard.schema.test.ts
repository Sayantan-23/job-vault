import { describe, it, expect } from 'vitest'
import { DashboardQuerySchema } from './dashboard.schema.js'

describe('DashboardQuerySchema', () => {
  it('accepts an empty query', () => {
    expect(DashboardQuerySchema.safeParse({}).success).toBe(true)
  })
  it('accepts search/status/ghostFilter', () => {
    const r = DashboardQuerySchema.parse({ search: 'acme', status: 'APPLIED', ghostFilter: 'stale' })
    expect(r).toMatchObject({ search: 'acme', status: 'APPLIED', ghostFilter: 'stale' })
  })
  it('rejects an unknown status', () => {
    expect(DashboardQuerySchema.safeParse({ status: 'NOPE' }).success).toBe(false)
  })
  it('rejects an unknown ghostFilter', () => {
    expect(DashboardQuerySchema.safeParse({ ghostFilter: 'spooky' }).success).toBe(false)
  })
})
