import { promises as dns } from 'node:dns'
import net from 'node:net'

// SSRF guard for the scraper's DIRECT fetch path: the server fetches a
// user-supplied URL, so we must refuse private/loopback/link-local targets that
// could reach internal services or cloud metadata endpoints. (The render-provider
// path is safer — Jina fetches the URL, not us.)

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return false
  const [a, b] = parts as [number, number, number, number]
  if (a === 0 || a === 10 || a === 127) return true // "this host", private, loopback
  if (a === 169 && b === 254) return true // link-local (incl. 169.254.169.254 metadata)
  if (a === 172 && b >= 16 && b <= 31) return true // private
  if (a === 192 && b === 168) return true // private
  if (a === 100 && b >= 64 && b <= 127) return true // CGNAT
  return false
}

export function isPrivateIp(ip: string): boolean {
  const version = net.isIP(ip)
  if (version === 4) return isPrivateIpv4(ip)
  if (version === 6) {
    const lower = ip.toLowerCase()
    if (lower === '::1' || lower === '::') return true // loopback / unspecified
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower)
    if (mapped?.[1]) return isPrivateIpv4(mapped[1]) // IPv4-mapped
    if (/^f[cd]/.test(lower)) return true // unique-local fc00::/7
    if (/^fe[89ab]/.test(lower)) return true // link-local fe80::/10
    return false
  }
  return false
}

export function isBlockedHostname(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, '')
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return true
  if (net.isIP(h)) return isPrivateIp(h)
  return false
}

// Throws when the URL is not safe to fetch server-side. Resolves a non-literal
// hostname to verify it doesn't point at a private address.
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
