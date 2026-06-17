import { describe, it, expect, vi, beforeEach } from 'vitest'

const { lookup } = vi.hoisted(() => ({ lookup: vi.fn() }))
vi.mock('node:dns', () => ({ promises: { lookup: (...args: unknown[]) => lookup(...args) } }))

import { isPrivateIp, isBlockedHostname, assertFetchableUrl } from './url-guard.js'

beforeEach(() => lookup.mockReset())

describe('isPrivateIp', () => {
  it('flags private/loopback/link-local IPv4', () => {
    for (const ip of ['127.0.0.1', '10.0.0.5', '192.168.1.1', '172.16.0.1', '169.254.169.254', '0.0.0.0', '100.64.0.1']) {
      expect(isPrivateIp(ip)).toBe(true)
    }
  })
  it('allows public IPv4', () => {
    for (const ip of ['8.8.8.8', '1.1.1.1', '34.117.59.81']) expect(isPrivateIp(ip)).toBe(false)
  })
  it('flags loopback/ULA/link-local and mapped IPv6 (dotted AND hex-compressed)', () => {
    for (const ip of [
      '::1',
      '::',
      'fc00::1',
      'fd12::1',
      'fe80::1',
      '::ffff:127.0.0.1',
      '::ffff:169.254.169.254', // dotted mapped
      '::ffff:a9fe:a9fe', // hex-compressed mapped == 169.254.169.254 (the bypass bug)
      '::ffff:7f00:1', // hex-compressed mapped == 127.0.0.1
      '64:ff9b::a9fe:a9fe', // NAT64-wrapped metadata
    ]) {
      expect(isPrivateIp(ip)).toBe(true)
    }
    expect(isPrivateIp('2001:4860:4860::8888')).toBe(false)
  })
  it('treats an unparseable string as unsafe', () => {
    expect(isPrivateIp('not-an-ip')).toBe(true)
  })
})

describe('isBlockedHostname', () => {
  it('blocks localhost and internal suffixes', () => {
    for (const h of ['localhost', 'db.localhost', 'svc.internal', 'printer.local']) expect(isBlockedHostname(h)).toBe(true)
  })
  it('blocks literal private IP hosts but allows public domains', () => {
    expect(isBlockedHostname('127.0.0.1')).toBe(true)
    expect(isBlockedHostname('192.168.0.1')).toBe(true)
    expect(isBlockedHostname('naukri.com')).toBe(false)
  })
})

describe('assertFetchableUrl', () => {
  it('rejects non-http(s) schemes', async () => {
    await expect(assertFetchableUrl('ftp://example.com/x')).rejects.toThrow(/http/)
    await expect(assertFetchableUrl('file:///etc/passwd')).rejects.toThrow(/http/)
  })
  it('rejects localhost and literal private IPs without a DNS lookup', async () => {
    await expect(assertFetchableUrl('http://localhost:3000/')).rejects.toThrow(/private or local/)
    await expect(assertFetchableUrl('http://127.0.0.1/')).rejects.toThrow(/private or local/)
    await expect(assertFetchableUrl('http://169.254.169.254/latest/meta-data')).rejects.toThrow(/private or local/)
    await expect(assertFetchableUrl('http://[::1]/')).rejects.toThrow(/private or local/)
    expect(lookup).not.toHaveBeenCalled()
  })
  it('rejects a public hostname that resolves to a private address (DNS rebinding)', async () => {
    lookup.mockResolvedValue([{ address: '10.0.0.5' }])
    await expect(assertFetchableUrl('https://evil.example.com/')).rejects.toThrow(/private or local/)
  })
  it('allows a public hostname that resolves to a public address', async () => {
    lookup.mockResolvedValue([{ address: '34.117.59.81' }])
    await expect(assertFetchableUrl('https://www.naukri.com/job-listings-x')).resolves.toBeUndefined()
  })
})
