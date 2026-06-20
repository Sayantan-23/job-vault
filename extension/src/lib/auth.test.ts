import { describe, it, expect } from 'vitest'
import { buildAuthorizeUrl, parseAuthRedirect, randomState } from './auth'

describe('buildAuthorizeUrl', () => {
  it('builds the authorize url with redirect_uri and state', () => {
    const parsed = new URL(buildAuthorizeUrl('http://localhost:3100', 'https://abc.chromiumapp.org/', 'nonce'))
    expect(parsed.pathname).toBe('/extension/authorize')
    expect(parsed.searchParams.get('redirect_uri')).toBe('https://abc.chromiumapp.org/')
    expect(parsed.searchParams.get('state')).toBe('nonce')
  })
})

describe('parseAuthRedirect', () => {
  it('reads token and state from the fragment', () => {
    expect(parseAuthRedirect('https://abc.chromiumapp.org/#token=jv_x&state=n')).toEqual({
      token: 'jv_x',
      state: 'n',
    })
  })
  it('returns nulls for a missing fragment or invalid url', () => {
    expect(parseAuthRedirect('https://abc.chromiumapp.org/')).toEqual({ token: null, state: null })
    expect(parseAuthRedirect('garbage')).toEqual({ token: null, state: null })
  })
})

describe('randomState', () => {
  it('is 32 hex chars and varies', () => {
    const a = randomState()
    const b = randomState()
    expect(a).toMatch(/^[0-9a-f]{32}$/)
    expect(a).not.toBe(b)
  })
})
