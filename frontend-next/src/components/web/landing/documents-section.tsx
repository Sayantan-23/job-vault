'use client'

import { DraggableCard } from '@/components/web/landing/draggable-card'
import { MiniLetterSheet } from '@/components/web/landing/mini/letter-sheet'
import { MiniResumeSheet } from '@/components/web/landing/mini/resume-sheet'
import { useReveal } from '@/components/web/landing/use-reveal'

// DOCUMENTS (signature output): two real-looking tailored documents fanned like
// paper on a desk — a cover letter that reads as a letter and a single-column
// ATS résumé on top. Both sheets are the faithful `size="full"` mini surfaces.
// On reveal the résumé plays one quiet beat (the "Humanize" chip lights and a
// weak bullet is struck and swapped) and the vermilion TAILORED stamp presses
// in — all CSS, gated on the stage's `[data-shown]`, no timers/state. Under
// reduced-motion / no-JS everything rests on its final refined + stamped state.
export function DocumentsSection() {
  const head = useReveal<HTMLDivElement>()
  const stage = useReveal<HTMLDivElement>({ threshold: 0.3 })
  const exports = useReveal<HTMLDivElement>()

  return (
    <section className="docs" id="documents">
      <div className="wrap">
        <div className="sec-head reveal" ref={head.ref}>
          <h2>
            Drafts that read like <em>you.</em>
          </h2>
          <p>
            One persona and one job produce a tailored résumé and cover letter. Refine the tone, keep
            a reusable library, and export to PDF.
          </p>
          <div className="refine-controls">
            <span className="rchip rchip-humanize">Humanize</span>
            <span className="rchip">Shorten</span>
            <span className="rchip">Make longer</span>
            <span className="rchip">Fix grammar</span>
          </div>
        </div>

        <div className="docstage viz-glow reveal" ref={stage.ref}>
          {/* Entrance: each sheet slides in from its own lower corner on reveal
              (CSS, gated on `[data-shown]`). Drag reuses the hero's DraggableCard
              (capability-gated, spring-back); the elastic is asymmetric so each
              sheet pulls far toward its outer edge but barely into its sibling. */}
          <div className="doc-fan doc-fan-letter">
            <DraggableCard elastic={{ left: 0.5, right: 0.1, top: 0.2, bottom: 0.2 }}>
              <MiniLetterSheet size="full" />
            </DraggableCard>
          </div>
          <div className="doc-fan doc-fan-resume">
            <DraggableCard elastic={{ left: 0.1, right: 0.5, top: 0.2, bottom: 0.2 }}>
              <MiniResumeSheet size="full" />
            </DraggableCard>
          </div>
        </div>

        <div className="exports reveal" ref={exports.ref}>
          <span className="export-cap">exports</span>
          <span className="export-chip">PDF</span>
          <span className="export-chip">LaTeX</span>
          <span className="export-chip">
            Open in Overleaf
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path
                d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>
    </section>
  )
}
