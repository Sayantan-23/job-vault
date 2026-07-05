'use client'

import type { CSSProperties } from 'react'
import { useReveal } from '@/components/web/landing/use-reveal'

// `CSSProperties` doesn't type CSS custom properties (the `--i` reveal-stagger
// index). Cast through a parameter (not an inline object-literal assertion) so
// it satisfies @typescript-eslint/consistent-type-assertions.
function cssVars<T extends Record<string, string | number>>(vars: T): CSSProperties {
  return vars as CSSProperties
}

// CAPTURE (extension): the solder-tap browser-chrome popup auto-extracting
// Title/Company/Location, source pills, and a quiet dedupe state ("no
// duplicate" / Saved to Wishlist). The prototype animates this purely through
// the global `.reveal` fade, so each block gets a play-once useReveal that
// stamps data-shown; landing.css owns the transition (and the complete
// reduced-motion final state).
export function CaptureSection() {
  const { ref } = useReveal<HTMLDivElement>()

  return (
    <section className="capture" id="extension">
      <div className="wrap" ref={ref}>
        <div className="cap-visual reveal" style={cssVars({ '--i': 0 })}>
          {/* Popup + source pills compose as one grounded object: pills tucked
              tight beneath, a single soft .contact shadow under the whole unit. */}
          <div className="cap-unit">
            <div className="popup">
            <div className="pop-bar">
              <span className="dots">
                <span />
                <span />
                <span />
              </span>
              <span className="ptitle">jobvault · capture</span>
            </div>
            <div className="pop-body">
              <div className="field">
                <div className="k">Title</div>
                <div className="v">Senior Product Manager</div>
              </div>
              <div className="field">
                <div className="k">Company</div>
                <div className="v">Ramp</div>
              </div>
              <div className="field">
                <div className="k">Location</div>
                <div className="v">San Francisco, CA · Hybrid</div>
              </div>
            </div>
            <div className="pop-foot">
              <span className="saved">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Saved to Wishlist
              </span>
              <span className="pop-note">no duplicate</span>
            </div>
          </div>
            <div className="pills">
              <span className="pill">LinkedIn</span>
              <span className="pill">Indeed</span>
              <span className="pill">Naukri</span>
              <span className="pill">Greenhouse</span>
              <span className="pill">+ any site</span>
            </div>
            <div className="contact" aria-hidden="true" />
          </div>
        </div>
        <div className="sec-head reveal" style={cssVars({ '--i': 1 })}>
          <h2>
            Save any posting in <em>one click</em>.
          </h2>
          <p>
            The Chrome extension reads the posting straight off the page, no copy-paste, and drops
            it into your pipeline. It skips duplicates and leaves a note on the timeline.
          </p>
        </div>
      </div>
    </section>
  )
}
