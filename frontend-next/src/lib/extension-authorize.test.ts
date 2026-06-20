import { describe, it, expect } from 'vitest'
import { isAllowedExtensionRedirect, buildExtensionRedirect } from './extension-authorize'

describe('isAllowedExtensionRedirect', () => {
  it('accepts an https <id>.chromiumapp.org redirect', () => {
    expect(isAllowedExtensionRedirect('https://abcdefghij.chromiumapp.org/')).toBe(true)
  })
  it('rejects non-https, wrong host, the bare apex, and malformed input', () => {
    expect(isAllowedExtensionRedirect('http://abc.chromiumapp.org/')).toBe(false)
    expect(isAllowedExtensionRedirect('https://evil.com/')).toBe(false)
    expect(isAllowedExtensionRedirect('https://abc.chromiumapp.org.evil.com/')).toBe(false)
    expect(isAllowedExtensionRedirect('https://chromiumapp.org/')).toBe(false)
    expect(isAllowedExtensionRedirect('not a url')).toBe(false)
    expect(isAllowedExtensionRedirect(null)).toBe(false)
    expect(isAllowedExtensionRedirect(undefined)).toBe(false)
  })
})

describe('buildExtensionRedirect', () => {
  it('puts token and state in the fragment', () => {
    expect(buildExtensionRedirect('https://abc.chromiumapp.org/', 'jv_key', 'nonce')).toBe(
      'https://abc.chromiumapp.org/#token=jv_key&state=nonce',
    )
  })
  it('omits state when absent and appends with & when a fragment already exists', () => {
    expect(buildExtensionRedirect('https://abc.chromiumapp.org/', 'jv_key', null)).toBe(
      'https://abc.chromiumapp.org/#token=jv_key',
    )
    expect(buildExtensionRedirect('https://abc.chromiumapp.org/#x', 'jv_key', null)).toBe(
      'https://abc.chromiumapp.org/#x&token=jv_key',
    )
  })
})
