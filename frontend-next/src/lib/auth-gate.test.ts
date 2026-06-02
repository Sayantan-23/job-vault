import { describe, it, expect } from 'vitest'
import { isSessionReachable } from './auth-gate'

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
