import { type CSSProperties } from 'react'
import Link from 'next/link'
import { MiniPhoneFrame } from './mini/phone-frame'
import { MiniLetterSheet } from './mini/letter-sheet'
import { MiniResumeSheet } from './mini/resume-sheet'
import { MiniBoardColumn } from './mini/board-column'
import { MiniExtensionPopup } from './mini/extension-popup'
import { DraggableCard } from './draggable-card'

// `CSSProperties` doesn't type CSS custom properties (the `--d`/`--bob` setters
// landing.css reads). Cast through a parameter (not an inline object-literal
// assertion) so it satisfies @typescript-eslint/consistent-type-assertions.
function cssVars<T extends Record<string, string | number>>(vars: T): CSSProperties {
  return vars as CSSProperties
}

/**
 * Hero — split layout. Left: the copy stack (headline / subtext / CTAs) riding
 * the `.intro` load stagger. Right: the "vault collage", five faithful mini
 * product surfaces composed at graded depth with two floating stat badges. The
 * whole collage rises in on load via the same pure-CSS `.intro`/`--d` stagger
 * (so hero stays a server component; reduced-motion + scripting:none land in the
 * final state automatically). Each mini surface is wrapped in a client-only
 * `<DraggableCard>` for playful elastic drag-and-spring-back — an interactive
 * leaf that doesn't affect the pure-CSS entrance stagger. The collage is
 * decorative → aria-hidden.
 */
export function Hero() {
  return (
    <header className="hero">
      <div className="wrap">
        <div className="hero-copy">
          <h1 className="intro" style={cssVars({ '--d': '40ms' })}>
            Applications go quiet.
            <br />
            <em>Yours won&apos;t.</em>
          </h1>
          <p className="deck intro" style={cssVars({ '--d': '140ms' })}>
            Capture postings in one click, generate tailored résumés and cover letters, and track
            every role before it goes cold.
          </p>
          <div className="cta intro" style={cssVars({ '--d': '240ms' })}>
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

        {/* Decorative product collage. Geometry (position/rotate/scale/z) lives
            in landing.css per-surface class; only the stagger `--d` is inline. */}
        <div className="vault-collage" aria-hidden="true">
          <div className="vc-item vc-phone" style={cssVars({ '--d': '360ms' })}>
            <DraggableCard>
              <MiniPhoneFrame />
            </DraggableCard>
          </div>
          <div className="vc-item vc-letter" style={cssVars({ '--d': '450ms' })}>
            <DraggableCard>
              <MiniLetterSheet />
            </DraggableCard>
          </div>
          <div className="vc-item vc-resume" style={cssVars({ '--d': '540ms' })}>
            <DraggableCard>
              <MiniResumeSheet />
            </DraggableCard>
          </div>
          <div className="vc-item vc-board" style={cssVars({ '--d': '630ms' })}>
            <DraggableCard>
              <MiniBoardColumn />
            </DraggableCard>
          </div>
          <div className="vc-item vc-popup" style={cssVars({ '--d': '720ms' })}>
            <DraggableCard>
              <MiniExtensionPopup />
            </DraggableCard>
          </div>

          <div
            className="vc-badge vc-badge-a"
            style={cssVars({ '--d': '900ms', '--bob': '6.5s' })}
          >
            <span className="vc-badge-dot vc-dot-fresh" />3 interviewing
          </div>
          <div className="vc-badge vc-badge-b" style={cssVars({ '--d': '1000ms', '--bob': '8s' })}>
            <span className="vc-badge-dot vc-dot-cold" />quiet 14d
          </div>
        </div>
      </div>
    </header>
  )
}
