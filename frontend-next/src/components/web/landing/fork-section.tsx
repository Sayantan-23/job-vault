'use client'

import type { CSSProperties } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useReveal } from '@/components/web/landing/use-reveal'

// `CSSProperties` doesn't type CSS custom properties (the `--i` setters
// landing.css reads). Cast through a parameter (not an inline object-literal
// assertion) so it satisfies @typescript-eslint/consistent-type-assertions.
function cssVars<T extends Record<string, string | number>>(vars: T): CSSProperties {
  return vars as CSSProperties
}

/**
 * Personas — the "one persona, every tailored draft" beat. Head + deck stacked
 * on top, then a two-column composition: a faithful persona card (left, mirrors
 * the real `PersonaCard`) and an evenly spaced list of generated documents
 * (right), connected by whitespace only — no drawn fan. On scroll-reveal the
 * card and rows fade-rise with the uniform `.reveal` + `--i` stagger. At
 * <=768px the CSS reflows into one column (card above, rows below).
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

        <div className="persona-stage">
          <div className="pcard reveal" style={cssVars({ '--i': 1 })}>
            <div className="pcard-head">
              <div className="pcard-id">
                <div className="pcard-name">Senior PM</div>
                <div className="pcard-count">
                  <span className="pcard-num">3</span> roles ·{' '}
                  <span className="pcard-num">4</span> skill groups
                </div>
              </div>
              <div className="pcard-actions">
                <span className="pcard-ibtn">
                  <Pencil aria-hidden="true" />
                </span>
                <span className="pcard-ibtn">
                  <Trash2 aria-hidden="true" />
                </span>
              </div>
            </div>
            <p className="pcard-summary">
              Product leader focused on B2B fintech; ships data-heavy roadmaps with small teams.
            </p>
            <div className="pcard-btn">Generate résumé</div>
          </div>

          <div className="doc-list">
            <div className="doc-row reveal" style={cssVars({ '--i': 2 })}>
              <div className="doc-main">
                <div className="doc-title">Résumé for Ramp</div>
                <div className="doc-ctx">Senior PM · tailored</div>
              </div>
              <div className="doc-date">Jun 28</div>
            </div>
            <div className="doc-row reveal" style={cssVars({ '--i': 3 })}>
              <div className="doc-main">
                <div className="doc-title">Cover letter for Loops</div>
                <div className="doc-ctx">Senior PM · refined</div>
              </div>
              <div className="doc-date">Jun 26</div>
            </div>
            <div className="doc-row reveal" style={cssVars({ '--i': 4 })}>
              <div className="doc-main">
                <div className="doc-title">Résumé for Figment</div>
                <div className="doc-ctx">Senior PM · exported</div>
              </div>
              <div className="doc-date">Jun 22</div>
            </div>
            <div className="doc-row reveal" style={cssVars({ '--i': 5 })}>
              <div className="doc-main">
                <div className="doc-title">Cover letter for Aerial</div>
                <div className="doc-ctx">Senior PM · draft</div>
              </div>
              <div className="doc-date">Jun 19</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
