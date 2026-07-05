'use client'

import type { CSSProperties } from 'react'
import { useReveal } from '@/components/web/landing/use-reveal'

// `CSSProperties` doesn't type CSS custom properties (the `--i` setters
// landing.css reads). Cast through a parameter (not an inline object-literal
// assertion) so it satisfies @typescript-eslint/consistent-type-assertions.
function cssVars<T extends Record<string, string | number>>(vars: T): CSSProperties {
  return vars as CSSProperties
}

/**
 * Personas fork — the "one persona, every tailored draft" beat. A single
 * Persona node on the left, four generated document rows on the right (two
 * résumés, two cover letters, different companies), as a plain two-column
 * layout. On scroll-reveal the rows fade in top-to-bottom (`--i` per-row
 * stagger, owned by landing.css). At <=940px the CSS reflows into one column
 * (node above, rows below).
 *
 * ponytail: temporary plain layout — T6 redesigns this section wholesale.
 */
export function ForkSection() {
  const { ref } = useReveal<HTMLDivElement>()

  return (
    <section id="personas">
      <div className="wrap" ref={ref}>
        <div className="sec-head reveal" style={cssVars({ '--i': 0 })}>
          <h2>
            One persona. <em>Every tailored draft.</em>
          </h2>
          <p>
            Personas are role profiles, up to five, built from your master profile or imported from a
            résumé PDF.
          </p>
        </div>

        <div className="fork-stage">
          <div className="node fork-node reveal" id="f-node" style={cssVars({ '--i': 1 })}>
            <div className="nlabel">Persona</div>
            <div className="nhead">
              <span className="nmono">M</span>
              <div className="ntitle">Senior PM</div>
            </div>
            <div className="nchips">
              <span className="nchip">Product</span>
              <span className="nchip">Roadmap</span>
              <span className="nchip">SQL</span>
            </div>
            <div className="nmeta" style={{ color: 'var(--accent-strong)' }}>
              3 / 5 used
            </div>
          </div>

          <div className="fork-rows">
            <div className="frow reveal" style={cssVars({ '--i': 2 })}>
              <div className="fr-main">
                <div className="fr-title">Résumé for Ramp</div>
                <div className="fr-ctx">Senior PM · tailored</div>
              </div>
              <div className="fr-date">Jun 28</div>
            </div>
            <div className="frow reveal" style={cssVars({ '--i': 3 })}>
              <div className="fr-main">
                <div className="fr-title">Cover letter for Loops</div>
                <div className="fr-ctx">Senior PM · refined</div>
              </div>
              <div className="fr-date">Jun 26</div>
            </div>
            <div className="frow reveal" style={cssVars({ '--i': 4 })}>
              <div className="fr-main">
                <div className="fr-title">Résumé for Figment</div>
                <div className="fr-ctx">Senior PM · exported</div>
              </div>
              <div className="fr-date">Jun 22</div>
            </div>
            <div className="frow reveal" style={cssVars({ '--i': 5 })}>
              <div className="fr-main">
                <div className="fr-title">Cover letter for Aerial</div>
                <div className="fr-ctx">Senior PM · draft</div>
              </div>
              <div className="fr-date">Jun 19</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
