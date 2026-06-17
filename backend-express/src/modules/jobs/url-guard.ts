import { promises as dns } from 'node:dns'
import net from 'node:net'
import ipaddr from 'ipaddr.js'

// SSRF guard for the scraper's DIRECT fetch path: the server fetches a
// user-supplied URL, so we must refuse private/loopback/link-local targets that
// could reach internal services or cloud metadata endpoints. (The render-provider
// path also routes through here before handing the URL to Jina.)
//
// IP classification uses ipaddr.js rather than hand-rolled regexes — those missed
// hex-compressed IPv4-mapped IPv6 (e.g. ::ffff:a9fe:a9fe == 169.254.169.254),
// NAT64, 6to4, and CGNAT. Anything that isn't a public unicast address is blocked.

// IPv4 ranges (ipaddr.js) that must never be reachable. Public addresses are
// 'unicast'; everything else is internal/reserved/special.
const ALLOWED_V4_RANGE = 'unicast'
// IPv6 ranges that are safe (public). Mapped/translated forms are unwrapped to
// their embedded IPv4 and checked there instead.
const ALLOWED_V6_RANGE = 'unicast'

export function isPrivateIp(ip: string): boolean {
  let addr: ipaddr.IPv4 | ipaddr.IPv6
  try {
    addr = ipaddr.parse(ip)
  } catch {
    return true // unparseable → treat as unsafe
  }
  if (addr.kind() === 'ipv6') {
    const v6 = addr as ipaddr.IPv6
    // IPv4-mapped (::ffff:a.b.c.d, in dotted OR hex form) → judge by the v4.
    if (v6.isIPv4MappedAddress()) return isPrivateIp(v6.toIPv4Address().toString())
    // 6to4 / Teredo / NAT64 embed a v4 too; rather than unwrap each, block any
    // non-public-unicast v6 outright.
    return v6.range() !== ALLOWED_V6_RANGE
  }
  return (addr as ipaddr.IPv4).range() !== ALLOWED_V4_RANGE
}

export function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '')
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return true
  if (net.isIP(h)) return isPrivateIp(h)
  return false
}

// Throws when the URL is not safe to fetch server-side. Resolves a non-literal
// hostname to verify it doesn't point at a private address. Note: this is a
// first-pass check; the actual connection is additionally validated at connect
// time (see safe-fetch.ts) to close the DNS-rebinding window.
export async function assertFetchableUrl(rawUrl: string): Promise<void> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new Error('Invalid URL')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) URLs can be scraped')
  }
  const hostname = url.hostname.replace(/^\[|\]$/g, '') // strip IPv6 brackets
  if (isBlockedHostname(hostname)) {
    throw new Error('Refusing to scrape a private or local address')
  }
  if (!net.isIP(hostname)) {
    let addresses: { address: string }[]
    try {
      addresses = await dns.lookup(hostname, { all: true })
    } catch {
      throw new Error('Could not resolve host')
    }
    if (addresses.some((a) => isPrivateIp(a.address))) {
      throw new Error('Refusing to scrape a private or local address')
    }
  }
}
