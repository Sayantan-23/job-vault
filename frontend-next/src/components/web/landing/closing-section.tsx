'use client'

import Link from 'next/link'

import { useReveal } from '@/components/web/landing/use-reveal'

// Closing CTA — centered headline + two CTAs on a reveal fade.
export function ClosingSection() {
  const { ref: wrapRef } = useReveal<HTMLDivElement>({ threshold: 0.3 })

  return (
    <section className="closing">
      <div className="wrap reveal" ref={wrapRef}>
        <h2 className="serif">
          Start the search that <em>stays warm</em>.
        </h2>
        <div className="cta">
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
          <a className="btn btn-ghost" href="#extension">
            Add to Chrome
          </a>
        </div>
      </div>
    </section>
  )
}
