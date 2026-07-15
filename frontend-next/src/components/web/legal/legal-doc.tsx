import type { ReactNode } from 'react'

// Shared "filed document" scaffolding for the three legal pages (privacy, terms,
// cookies). LegalDoc is the article wrapper; LegalSection is one numbered entry —
// a Geist Mono section number (01, 02, …) in the left gutter, a serif heading,
// then readable prose body. Sections are separated by hairline rules. All three
// pages compose from these two components, so there's no per-page markup.
// Styled by styles/web/pages/legal.css. Server components, zero client JS.

export function LegalDoc({ children }: { children: ReactNode }) {
  return <article className="legal-doc">{children}</article>
}

export function LegalSection({
  n,
  title,
  inShort,
  children,
}: {
  n: string
  title: ReactNode
  /** Optional one-sentence plain-language summary, shown above the prose. */
  inShort?: string
  children: ReactNode
}) {
  return (
    <section className="legal-section">
      <span className="legal-num" aria-hidden="true">
        {n}
      </span>
      <div className="legal-section-body">
        <h2>{title}</h2>
        {inShort ? (
          <p className="legal-inshort">
            <span className="legal-inshort-label">In short</span>
            {inShort}
          </p>
        ) : null}
        <div className="legal-prose">{children}</div>
      </div>
    </section>
  )
}
