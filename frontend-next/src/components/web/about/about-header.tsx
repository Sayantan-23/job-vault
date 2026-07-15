'use client'

import type { CSSProperties } from 'react'

import { MiniLetterSheet } from '@/components/web/landing/mini/letter-sheet'
import { MiniResumeSheet } from '@/components/web/landing/mini/resume-sheet'
import { useReveal } from '@/components/web/landing/use-reveal'

// `CSSProperties` doesn't type CSS custom properties (the `--i` stagger index
// landing.css reads). Cast through a parameter so it satisfies
// @typescript-eslint/consistent-type-assertions.
function cssVars<T extends Record<string, string | number>>(vars: T): CSSProperties {
  return vars as CSSProperties
}

// /about header: a literal "About" h1 (SEO) with the statement line demoted to
// a serif deck beneath it, beside a fanned pair of typeset sheets (résumé
// overlapping the cover letter, both tilted — the landing documents grammar).
// Two-column at desktop, stacked at 768px. Fades in on the shared `.reveal`.
export function AboutHeader() {
  const { ref } = useReveal<HTMLDivElement>()

  return (
    <header className="about-head">
      <div className="wrap" ref={ref}>
        <div className="about-head-copy reveal" style={cssVars({ '--i': 0 })}>
          <span className="eyebrow">A note from the maker</span>
          <h1>About</h1>
          <p className="about-deck">
            Built by one person who got tired of <em>the silence.</em>
          </p>
        </div>
        <div className="about-head-art reveal" style={cssVars({ '--i': 1 })}>
          <div className="about-fan-letter">
            <MiniLetterSheet size="full" />
          </div>
          <div className="about-fan-resume">
            <MiniResumeSheet size="full" />
          </div>
        </div>
      </div>
    </header>
  )
}
