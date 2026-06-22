// Shared DOM helpers for the extractors. All take an explicit root/doc so they
// run under jsdom in tests without a live page.

/** First non-empty trimmed text content among the selectors, scoped to root. */
export function firstText(root: ParentNode, selectors: string[]): string | undefined {
  for (const selector of selectors) {
    const text = root.querySelector(selector)?.textContent?.trim()
    if (text) return collapseWhitespace(text)
  }
  return undefined
}

/** First element matching any selector, scoped to root (for innerHTML → Markdown). */
export function firstElement(root: ParentNode, selectors: string[]): Element | null {
  for (const selector of selectors) {
    const el = root.querySelector(selector)
    if (el) return el
  }
  return null
}

/** First element matching any selector, else the document itself. */
export function firstContainer(doc: Document, selectors: string[]): ParentNode {
  for (const selector of selectors) {
    const el = doc.querySelector(selector)
    if (el) return el
  }
  return doc
}

/** First attribute value among [selector, attr] pairs, scoped to root. */
export function firstAttr(root: ParentNode, pairs: ReadonlyArray<[string, string]>): string | undefined {
  for (const [selector, attr] of pairs) {
    const value = root.querySelector(selector)?.getAttribute(attr)?.trim()
    if (value) return collapseWhitespace(value)
  }
  return undefined
}

export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

// Reads the first schema.org JobPosting from JSON-LD, if present. Many ATS boards
// (Greenhouse, Lever, Ashby) and generic sites emit this.
export function jobPostingJsonLd(doc: Document): Record<string, unknown> | null {
  const scripts = doc.querySelectorAll('script[type="application/ld+json"]')
  for (const script of Array.from(scripts)) {
    let parsed: unknown
    try {
      parsed = JSON.parse(script.textContent ?? '')
    } catch {
      continue
    }
    const node = findJobPosting(parsed)
    if (node) return node
  }
  return null
}

function findJobPosting(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findJobPosting(item)
      if (found) return found
    }
    return null
  }
  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>
    const type = record['@type']
    if (type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'))) {
      return record
    }
    if (Array.isArray(record['@graph'])) return findJobPosting(record['@graph'])
  }
  return null
}
