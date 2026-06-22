import TurndownService from 'turndown'

// Ported verbatim from backend-express/src/modules/jobs/markdown.ts so client
// capture produces the same clean Markdown snapshot as the server scrape
// (Turndown 7.2.4 + the same sanitization).
const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
})
turndown.remove(['script', 'style', 'nav', 'footer', 'noscript', 'iframe'])

export function htmlToMarkdown(html: string): string {
  if (!html) return ''

  // Pre-strip tags Turndown handles poorly when nested.
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')

  const md = turndown
    .turndown(cleaned)
    .replace(/[ \t]+$/gm, '')
    .replace(/^(\s*[-*+])[ \t]+/gm, '$1 ')

  return sanitizeSnapshotMarkdown(md)
}

// Scrubs images (logos, tracking pixels, Naukri-style `data:`/transparent-pixel
// anti-scrape decoys) and `data:` URIs from a snapshot. Keeps link text.
const URL_GROUP = String.raw`\((?:[^()]|\([^()]*\))*\)`
const LINKED_IMAGE_RE = new RegExp(String.raw`\[!\[[^\]]*\]${URL_GROUP}\]${URL_GROUP}`, 'g')
const IMAGE_RE = new RegExp(String.raw`!\[[^\]]*\]${URL_GROUP}`, 'g')
const DATA_LINK_RE = new RegExp(String.raw`\[([^\]]*)\]\(data:(?:[^()]|\([^()]*\))*\)`, 'gi')

export function sanitizeSnapshotMarkdown(markdown: string): string {
  if (!markdown) return ''
  return markdown
    .replace(LINKED_IMAGE_RE, '')
    .replace(IMAGE_RE, '')
    .replace(/<img\b[^>]*>/gi, '')
    .replace(/!\[[^\]]*\]\[[^\]]*\]/g, '')
    .replace(DATA_LINK_RE, '$1')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

// Converts a description's HTML (from a DOM element's innerHTML or a JSON-LD
// description string) to clean Markdown; returns undefined when empty.
export function descriptionToMarkdown(html: string | undefined): string | undefined {
  if (!html) return undefined
  const md = htmlToMarkdown(html)
  return md || undefined
}
