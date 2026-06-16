/**
 * Parse `name=value` pairs out of a backend response's Set-Cookie header list,
 * keeping only the requested cookie names. Each Set-Cookie string looks like
 * `accessToken=<jwt>; Path=/; HttpOnly; SameSite=Lax` — we want just the leading
 * `name=value` segment, ignoring the attributes.
 */
export function extractCookieValues(setCookies: string[], names: string[]): Record<string, string> {
  const wanted = new Set(names)
  const out: Record<string, string> = {}
  for (const raw of setCookies) {
    const firstSegment = raw.split(';', 1)[0] ?? ''
    const eq = firstSegment.indexOf('=')
    if (eq === -1) continue
    const name = firstSegment.slice(0, eq).trim()
    const value = firstSegment.slice(eq + 1).trim()
    if (wanted.has(name)) out[name] = value
  }
  return out
}

/**
 * Rebuild a request `Cookie` header from the original, replacing/adding the given
 * cookie values. Used to hand a freshly-rotated access token to the downstream
 * server render in the same request that triggered the refresh.
 */
export function mergeCookieHeader(original: string | null, overrides: Record<string, string>): string {
  const jar = new Map<string, string>()
  if (original) {
    for (const part of original.split(';')) {
      const seg = part.trim()
      if (!seg) continue
      const eq = seg.indexOf('=')
      if (eq === -1) continue
      jar.set(seg.slice(0, eq).trim(), seg.slice(eq + 1).trim())
    }
  }
  for (const [name, value] of Object.entries(overrides)) jar.set(name, value)
  return Array.from(jar, ([name, value]) => `${name}=${value}`).join('; ')
}
