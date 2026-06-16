import { describe, it, expect } from 'vitest'
import { extractCookieValues, mergeCookieHeader } from './middleware-cookies'

describe('extractCookieValues', () => {
  it('pulls the leading name=value out of full Set-Cookie strings', () => {
    const setCookies = [
      'accessToken=aaa.bbb.ccc; Path=/; HttpOnly; SameSite=Lax',
      'refreshToken=rrr.sss.ttt; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800',
    ]
    expect(extractCookieValues(setCookies, ['accessToken', 'refreshToken'])).toEqual({
      accessToken: 'aaa.bbb.ccc',
      refreshToken: 'rrr.sss.ttt',
    })
  })

  it('ignores cookies not in the requested set', () => {
    const setCookies = ['other=1; Path=/', 'accessToken=tok; Path=/']
    expect(extractCookieValues(setCookies, ['accessToken'])).toEqual({ accessToken: 'tok' })
  })

  it('skips malformed entries with no value', () => {
    expect(extractCookieValues(['garbage', 'accessToken=tok'], ['accessToken'])).toEqual({
      accessToken: 'tok',
    })
  })
})

describe('mergeCookieHeader', () => {
  it('overrides the rotated cookies while preserving the rest', () => {
    const original = 'theme=dark; refreshToken=old; foo=bar'
    const merged = mergeCookieHeader(original, { accessToken: 'NEW_A', refreshToken: 'NEW_R' })
    const jar = Object.fromEntries(merged.split('; ').map((p) => p.split('=')))
    expect(jar).toEqual({ theme: 'dark', refreshToken: 'NEW_R', foo: 'bar', accessToken: 'NEW_A' })
  })

  it('works when the original header is null', () => {
    expect(mergeCookieHeader(null, { accessToken: 'A' })).toBe('accessToken=A')
  })
})
