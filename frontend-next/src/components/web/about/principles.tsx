'use client'

import type { CSSProperties } from 'react'

import { useReveal } from '@/components/web/landing/use-reveal'

// `CSSProperties` doesn't type CSS custom properties (the `--i` stagger index
// landing.css reads). Cast through a parameter so it satisfies
// @typescript-eslint/consistent-type-assertions.
function cssVars<T extends Record<string, string | number>>(vars: T): CSSProperties {
  return vars as CSSProperties
}

// Where JobVault stands: four positions in a 2×2 hairline grid — a mono accent
// index, a serif title, one or two muted lines. No boxes, quiet dividers. Head +
// cells fade in on reveal with the shared `.reveal` + `--i` stagger. Styled by
// styles/web/pages/about.css.
const PRINCIPLES: Array<{ title: string; text: string }> = [
  {
    title: 'Free by default',
    text: 'Tracking, personas, and the extension cost nothing. AI generation runs on an hourly rate limit; no card, ever.',
  },
  {
    title: 'The AI drafts, you decide',
    text: 'Every document is generated from what you wrote, and nothing leaves without you reviewing each line.',
  },
  {
    title: 'No lock-in',
    text: 'Résumés export as PDF and LaTeX, or open straight in Overleaf. Your data is yours to take.',
  },
  {
    title: 'Built against silence',
    text: "Ghost-proofing isn't a feature bolted on. It's the reason the product exists.",
  },
]

export function Principles() {
  const { ref } = useReveal<HTMLDivElement>()

  return (
    <section className="about-principles">
      <div className="wrap" ref={ref}>
        <div className="sec-head reveal" style={cssVars({ '--i': 0 })}>
          <span className="eyebrow">Principles</span>
          <h2>
            Where it <em>stands.</em>
          </h2>
        </div>

        <div className="principle-grid">
          {PRINCIPLES.map((p, i) => (
            <div className="principle reveal" key={p.title} style={cssVars({ '--i': i + 1 })}>
              <span className="principle-num">{String(i + 1).padStart(2, '0')}</span>
              <div className="principle-body">
                <h3 className="principle-title">{p.title}</h3>
                <p className="principle-text">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
