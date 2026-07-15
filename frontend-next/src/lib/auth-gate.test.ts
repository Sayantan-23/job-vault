import { describe, it, expect } from 'vitest'
import { isSessionReachable, safeNextPath } from './auth-gate'

describe('isSessionReachable', () => {
  it('is reachable when an access token is present', () => {
    expect(isSessionReachable({ accessToken: 'a' })).toBe(true)
  })
  it('is reachable when only a refresh token is present (access token expired)', () => {
    expect(isSessionReachable({ refreshToken: 'r' })).toBe(true)
  })
  it('is reachable when both are present', () => {
    expect(isSessionReachable({ accessToken: 'a', refreshToken: 'r' })).toBe(true)
  })
  it('is NOT reachable when no auth cookies are present', () => {
    expect(isSessionReachable({})).toBe(false)
  })
})

describe('safeNextPath', () => {
  it('accepts same-site absolute paths', () => {
    expect(safeNextPath('/app/jobs')).toBe('/app/jobs')
    expect(safeNextPath('/app/jobs?job=123&view=board')).toBe('/app/jobs?job=123&view=board')
  })
  it('rejects protocol-relative and backslash-tricked paths', () => {
    expect(safeNextPath('//evil.com/app')).toBeNull()
    expect(safeNextPath('/\\evil.com')).toBeNull()
  })
  it('rejects absolute URLs and relative paths', () => {
    expect(safeNextPath('https://evil.com')).toBeNull()
    expect(safeNextPath('app/jobs')).toBeNull()
  })
  it('rejects empty/missing values', () => {
    expect(safeNextPath('')).toBeNull()
    expect(safeNextPath(null)).toBeNull()
    expect(safeNextPath(undefined)).toBeNull()
  })
})
