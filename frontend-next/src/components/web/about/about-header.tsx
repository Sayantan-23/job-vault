'use client'

import type { CSSProperties } from 'react'

import { MiniLetterSheet } from '@/components/web/landing/mini/letter-sheet'
import { useReveal } from '@/components/web/landing/use-reveal'

// `CSSProperties` doesn't type CSS custom properties (the `--i` stagger index
// landing.css reads). Cast through a parameter so it satisfies
// @typescript-eslint/consistent-type-assertions.
function cssVars<T extends Record<string, string | number>>(vars: T): CSSProperties {
  return vars as CSSProperties
}

// /about header: the statement headline (left) beside a typeset cover-letter
// sheet (right) — a letter next to a maker's letter. Two-column at desktop,
// stacked at 768px. Fades in on reveal with the shared `.reveal` + `--i` stagger.
export function AboutHeader() {
  const { ref } = useReveal<HTMLDivElement>()

  return (
    <header className="about-head">
      <div className="wrap" ref={ref}>
        <div className="about-head-copy reveal" style={cssVars({ '--i': 0 })}>
          <span className="eyebrow">A note from the maker</span>
          <h1>
            Built by one person who got tired of <em>the silence.</em>
          </h1>
        </div>
        <div className="about-head-art reveal" style={cssVars({ '--i': 1 })}>
          <MiniLetterSheet size="full" />
        </div>
      </div>
    </header>
  )
}
