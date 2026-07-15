'use client'

import type { CSSProperties } from 'react'
import Link from 'next/link'

import { useReveal } from '@/components/web/landing/use-reveal'

// `CSSProperties` doesn't type CSS custom properties (the `--i` reveal-stagger
// index). Cast through a parameter (not an inline object-literal assertion) so
// it satisfies @typescript-eslint/consistent-type-assertions.
function cssVars<T extends Record<string, string | number>>(vars: T): CSSProperties {
  return vars as CSSProperties
}

// Closing CTA — the top of the dark finale (ink surface shared with the footer
// below it, so they read as one block). Centered headline + supporting line +
// two CTAs on the uniform reveal fade, staggered by their `--i` index.
export function ClosingSection() {
  const { ref: wrapRef } = useReveal<HTMLDivElement>({ threshold: 0.3 })

  return (
    <section className="closing">
      <div className="wrap" ref={wrapRef}>
        <h2 className="serif reveal" style={cssVars({ '--i': 0 })}>
          Start the search that <em>stays warm.</em>
        </h2>
        <p className="closing-deck reveal" style={cssVars({ '--i': 1 })}>
          Free to use. The extension, the board, and your first tailored documents included.
        </p>
        <div className="cta reveal" style={cssVars({ '--i': 2 })}>
          <Link className="btn btn-primary" href="/register">
            Start free
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <Link className="btn btn-outline-ink" href="/#extension">
            Add to Chrome
          </Link>
        </div>
      </div>
    </section>
  )
}
