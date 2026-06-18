import { lookup as dnsLookup, type LookupAddress } from 'node:dns'
import { Agent } from 'undici'
import { assertFetchableUrl, isPrivateIp } from './url-guard.js'

// An SSRF-hardened fetch for the scraper. Three layers of defense, because the
// guard alone (a one-time pre-fetch check of the original URL) is bypassable:
//   1. assertFetchableUrl on the original URL AND on every redirect hop.
//   2. redirect: 'manual' — we follow 3xx ourselves so each Location is
//      re-validated (undici's default auto-follow would skip the guard).
//   3. a connect-time DNS validator on the dispatcher — the IP undici actually
//      connects to is re-checked, closing the DNS-rebinding window between the
//      guard's resolution and the socket's resolution.

const MAX_REDIRECTS = 5

// undici calls this in place of dns.lookup when establishing the socket. We
// resolve, reject any private/loopback/link-local/metadata address, and hand
// undici the validated address — so the connected IP is exactly the checked one.
function validatingLookup(
  hostname: string,
  options: { all?: boolean | undefined; family?: number | string | undefined },
  callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
): void {
  const lookupOpts: { all: true; family?: 4 | 6 } = { all: true }
  if (options.family === 4 || options.family === 6) lookupOpts.family = options.family
  dnsLookup(hostname, lookupOpts, (err, addresses) => {
    if (err) return callback(err, '')
    const list = Array.isArray(addresses) ? addresses : []
    const blocked = list.find((a) => isPrivateIp(a.address))
    if (blocked) {
      return callback(
        Object.assign(new Error('Refusing to connect to a private or local address'), { code: 'ESSRFBLOCKED' }),
        '',
      )
    }
    if (options.all) return callback(null, list)
    const first = list[0]
    if (!first) return callback(Object.assign(new Error('No address'), { code: 'ENOTFOUND' }), '')
    callback(null, first.address, first.family)
  })
}

const safeDispatcher = new Agent({ connect: { lookup: validatingLookup } })

// Reads a response body as text, aborting once it exceeds maxBytes. Guards
// against a huge or slow-drip page exhausting memory.
export async function readTextCapped(response: Response, maxBytes: number): Promise<string> {
  const lengthHeader = Number(response.headers.get('content-length'))
  if (Number.isFinite(lengthHeader) && lengthHeader > maxBytes) {
    throw new Error('Response too large')
  }
  const body = response.body
  if (!body) return ''
  const reader = body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) {
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        throw new Error('Response too large')
      }
      chunks.push(value)
    }
  }
  return Buffer.concat(chunks).toString('utf-8')
}

export interface SafeFetchOptions {
  headers?: Record<string, string>
  timeoutMs?: number
}

// Fetches `rawUrl`, following redirects manually and re-validating every hop.
export async function safeFetch(rawUrl: string, options: SafeFetchOptions = {}): Promise<Response> {
  const { headers, timeoutMs = 15_000 } = options
  let current = rawUrl
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertFetchableUrl(current)
    const response = await fetch(current, {
      headers,
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
      // @ts-expect-error — `dispatcher` is an undici extension to RequestInit.
      dispatcher: safeDispatcher,
    })
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location')
      if (!location) return response
      current = new URL(location, current).toString()
      continue
    }
    return response
  }
  throw new Error('Too many redirects')
}
