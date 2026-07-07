'use client'

import type { CSSProperties } from 'react'
import { CaptureDeck } from '@/components/web/landing/capture-deck'
import { useReveal } from '@/components/web/landing/use-reveal'

// `CSSProperties` doesn't type CSS custom properties (the `--i` reveal-stagger
// index). Cast through a parameter (not an inline object-literal assertion) so
// it satisfies @typescript-eslint/consistent-type-assertions.
function cssVars<T extends Record<string, string | number>>(vars: T): CSSProperties {
  return vars as CSSProperties
}

// CAPTURE (extension): an interactive 2-card deck (capture + success popups)
// plus the source pills row. `CaptureDeck` ('use client', motion) plays the
// entrance drop when the section reveals, then lets the user grab the top card
// and drag it to swap the two. SSR / no-JS / reduced-motion render the resting
// stacked state (success on top, capture receded) straight from landing.css.
export function CaptureSection() {
  const { ref } = useReveal<HTMLDivElement>()

  return (
    <section className="capture" id="extension">
      <div className="wrap" ref={ref}>
        <div className="cap-visual viz-glow reveal" style={cssVars({ '--i': 0 })}>
          <CaptureDeck />
          <p className="ext-hint">drag to flip</p>
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
