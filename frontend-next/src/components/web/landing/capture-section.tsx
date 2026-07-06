'use client'

import type { CSSProperties } from 'react'
import { MiniExtensionPopup } from '@/components/web/landing/mini/extension-popup'
import { useReveal } from '@/components/web/landing/use-reveal'

// `CSSProperties` doesn't type CSS custom properties (the `--i` reveal-stagger
// index). Cast through a parameter (not an inline object-literal assertion) so
// it satisfies @typescript-eslint/consistent-type-assertions.
function cssVars<T extends Record<string, string | number>>(vars: T): CSSProperties {
  return vars as CSSProperties
}

// CAPTURE (extension): a faithful full-size capture popup playing a two-beat
// capture -> success swap when the section reveals, plus the source pills row.
// Both popup states are rendered stacked in one 360px frame: capture is the
// flow layer (holds the stage height), success the centered overlay that
// crossfades in. The swap is pure CSS gated on the section's `data-shown` (see
// landing.css) — no timers — and resolves straight to success under
// reduced-motion / no-JS.
export function CaptureSection() {
  const { ref } = useReveal<HTMLDivElement>()

  return (
    <section className="capture" id="extension">
      <div className="wrap" ref={ref}>
        <div className="cap-visual viz-glow reveal" style={cssVars({ '--i': 0 })}>
          <div className="ext-stage">
            {/* Capture holds the frame height; it ends hidden, so it's the
                aria-hidden layer. Success is the meaningful resting state. */}
            <div className="ext-layer ext-layer--capture" aria-hidden="true">
              <MiniExtensionPopup size="full" state="capture" />
            </div>
            <div className="ext-layer ext-layer--success">
              <MiniExtensionPopup size="full" state="success" />
            </div>
          </div>
          <div className="ext-pills">
            <span className="ext-pill">LinkedIn</span>
            <span className="ext-pill">Indeed</span>
            <span className="ext-pill">Naukri</span>
            <span className="ext-pill">Greenhouse</span>
            <span className="ext-pill">+ any site</span>
          </div>
        </div>
        <div className="sec-head reveal" style={cssVars({ '--i': 1 })}>
          <h2>
            Save any posting in <em>one click</em>.
          </h2>
          <p>
            The Chrome extension reads the posting off the page and drops it into your pipeline. No
            copy and paste, no lost tabs.
          </p>
        </div>
      </div>
    </section>
  )
}
