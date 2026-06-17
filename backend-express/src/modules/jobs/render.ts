import { getEnv } from '@/config/env.js'
import { logger } from '@/shared/logger.js'
import { readTextCapped } from './safe-fetch.js'
import { assertFetchableUrl } from './url-guard.js'

// A JS-capable render provider: given a URL it returns the page's real content
// (after the browser-side rendering the static fetch can't do), as Markdown plus
// an optional title. Providers are tried in order by the scrape pipeline; the
// first one to return non-empty content wins. Returns null on failure so the
// chain can move on.
export interface RenderResult {
  markdown: string
  title?: string
}

export interface RenderClient {
  name: string
  render(url: string): Promise<RenderResult | null>
}

const RENDER_TIMEOUT_MS = 45_000
const MAX_RENDER_BYTES = 5_000_000

// Jina Reader: GET https://r.jina.ai/<target-url> renders the page in a real
// browser and returns Markdown prefixed with `Title:` / `URL Source:` /
// `Markdown Content:` headers. Free and keyless; an optional bearer key raises
// rate limits.
export function createJinaRenderClient(apiKey?: string): RenderClient {
  return {
    name: 'jina',
    async render(url: string): Promise<RenderResult | null> {
      const headers: Record<string, string> = {
        Accept: 'text/plain',
        'X-Return-Format': 'markdown',
      }
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
      // Guard the target before handing it to Jina, so we never use the render
      // provider to launder a request to a private/local address.
      try {
        await assertFetchableUrl(url)
      } catch (err) {
        logger.warn({ err, url }, 'jina render target failed the SSRF guard')
        return null
      }
      let response: Response
      try {
        response = await fetch(`https://r.jina.ai/${url}`, {
          headers,
          signal: AbortSignal.timeout(RENDER_TIMEOUT_MS),
        })
      } catch (err) {
        logger.warn({ err, url }, 'jina render request failed')
        return null
      }
      if (!response.ok) {
        logger.warn({ status: response.status, url }, 'jina render returned non-ok')
        return null
      }
      let text: string
      try {
        text = await readTextCapped(response, MAX_RENDER_BYTES)
      } catch (err) {
        logger.warn({ err, url }, 'jina render body exceeded the size cap')
        return null
      }
      return parseJinaResponse(text)
    },
  }
}

// Splits Jina's `Title:` / `URL Source:` / `Markdown Content:` envelope into a
// title and the Markdown body. Falls back to treating the whole payload as the
// body when the headers aren't present.
export function parseJinaResponse(text: string): RenderResult | null {
  if (!text.trim()) return null
  // Anchor the body marker to its own line so a stray "Markdown Content:" inside
  // the page body can't truncate the content. Title is read only from the header
  // block (before the marker) for the same reason.
  const markerMatch = /^Markdown Content:[ \t]*$/m.exec(text)
  const header = markerMatch ? text.slice(0, markerMatch.index) : ''
  const markdown = (markerMatch ? text.slice(markerMatch.index + markerMatch[0].length) : text).trim()
  if (!markdown) return null
  const result: RenderResult = { markdown }
  const title = /^Title:\s*(.+)$/m.exec(header)?.[1]?.trim()
  if (title) result.title = title
  return result
}

// The ordered list of render providers for the current config. Jina is the
// always-on default; paid providers are appended only when their key is set.
// Returns an empty list when rendering is disabled.
export function getRenderClients(): RenderClient[] {
  const env = getEnv()
  if (!env.SCRAPER_RENDER_ENABLED) return []
  const clients: RenderClient[] = [createJinaRenderClient(env.JINA_API_KEY)]
  // Paid providers (Firecrawl, ScrapingBee) slot in here behind their env keys —
  // the interface is ready; wiring a concrete client is a follow-up when a key
  // is provided.
  return clients
}

// Walks the provider chain, returning the first non-empty render. Each provider
// is best-effort; a thrown/failed provider is logged and skipped.
export async function renderUrl(url: string, clients = getRenderClients()): Promise<RenderResult | null> {
  for (const client of clients) {
    try {
      const result = await client.render(url)
      if (result && result.markdown.trim()) return result
    } catch (err) {
      logger.warn({ err, provider: client.name, url }, 'render provider threw')
    }
  }
  return null
}
