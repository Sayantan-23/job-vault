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

  return turndown
    .turndown(cleaned)
    // Strip trailing whitespace first so Turndown's whitespace-padded blank
    // lines (e.g. the "  " it emits between <br>s) become truly empty before
    // we collapse runs of blank lines below.
    .replace(/[ \t]+$/gm, '')
    // Normalize list-item markers to a single space (this Turndown version pads
    // them to align content, e.g. "-   One").
    .replace(/^(\s*[-*+])[ \t]+/gm, '$1 ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
