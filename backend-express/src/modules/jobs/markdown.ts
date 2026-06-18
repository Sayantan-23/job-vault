import TurndownService from 'turndown'

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
    // Strip trailing whitespace first so Turndown's whitespace-padded blank
    // lines (e.g. the "  " it emits between <br>s) become truly empty before
    // we collapse runs of blank lines below.
    .replace(/[ \t]+$/gm, '')
    // Normalize list-item markers to a single space (this Turndown version pads
    // them to align content, e.g. "-   One").
    .replace(/^(\s*[-*+])[ \t]+/gm, '$1 ')

  return sanitizeSnapshotMarkdown(md)
}

// Scrubs a snapshot's Markdown of artifacts that are never useful in a job
// description and that some boards inject deliberately: images (company logos,
// tracking pixels, and Naukri-style `data:`/transparent-pixel anti-scrape
// decoys) and `data:` URIs. Applied to EVERY snapshot we persist, regardless of
// source (static fetch or a render provider like Jina, whose Markdown is laden
// with nav logos and image links). Keeps link text, drops the junk. Idempotent.
// A Markdown URL group `( … )` that tolerates one level of nested parentheses,
// e.g. `(https://x/Foo_(bar).png)` — a naive `[^)]*` would stop at the first `)`
// and mangle the surrounding prose.
const URL_GROUP = String.raw`\((?:[^()]|\([^()]*\))*\)`

const LINKED_IMAGE_RE = new RegExp(String.raw`\[!\[[^\]]*\]${URL_GROUP}\]${URL_GROUP}`, 'g')
const IMAGE_RE = new RegExp(String.raw`!\[[^\]]*\]${URL_GROUP}`, 'g')
const DATA_LINK_RE = new RegExp(String.raw`\[([^\]]*)\]\(data:(?:[^()]|\([^()]*\))*\)`, 'gi')

export function sanitizeSnapshotMarkdown(markdown: string): string {
  if (!markdown) return ''
  return (
    markdown
      // Linked images `[![alt](img)](href)` — logos/banners. Drop entirely.
      .replace(LINKED_IMAGE_RE, '')
      // Standalone image Markdown `![alt](url)`, incl. `![](<data:…>)` decoys and
      // transparent pixels.
      .replace(IMAGE_RE, '')
      // Raw <img> HTML that survived into Markdown.
      .replace(/<img\b[^>]*>/gi, '')
      // Reference-style image usages `![alt][id]` (an orphaned `[id]: url`
      // definition left behind renders as nothing, so it's harmless).
      .replace(/!\[[^\]]*\]\[[^\]]*\]/g, '')
      // Links whose href is a `data:` URI — keep the visible text, drop the href.
      .replace(DATA_LINK_RE, '$1')
      // Tidy up the holes left behind.
      .replace(/[ \t]+$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  )
}
