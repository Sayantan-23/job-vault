'use client'

import type { CSSProperties } from 'react'
import { useReveal } from '@/components/web/landing/use-reveal'

// CAPTURE (extension): the solder-tap browser-chrome popup auto-extracting
// Title/Company/Location, source pills, and a quiet dedupe state ("no
// duplicate" / Saved to Wishlist). The prototype animates this purely through
// the global `.reveal` fade, so each block gets a play-once useReveal that
// stamps data-shown; landing.css owns the transition (and the complete
// reduced-motion final state).
export function CaptureSection() {
  const visual = useReveal<HTMLDivElement>()
  const head = useReveal<HTMLDivElement>()

  // Reveal delay handed to landing.css via the `--rd` custom property (matches
  // the prototype's `style="--rd:80ms"`). CSSProperties doesn't type custom
  // props, so we widen via an identifier cast (the `consistent-type-assertions`
  // rule only bans assertions on object literals, not on a named const).
  const headVars = { '--rd': '80ms' }
  const headStyle = headVars as CSSProperties
  // The prototype's inline "no duplicate" micro-label has no landing.css class,
  // so its mono/size/color tokens stay inline (named-const cast, same rule).
  const noDuplicateVars = {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--ink-faint)',
  }
  const noDuplicateStyle = noDuplicateVars as CSSProperties

  return (
    <section className="capture" id="extension">
      <div className="wrap">
        <div className="cap-visual reveal" ref={visual.ref}>
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
              <span style={noDuplicateStyle}>no duplicate</span>
            </div>
          </div>
          <div className="pills">
            <span className="pill">LinkedIn</span>
            <span className="pill">Indeed</span>
            <span className="pill">Naukri</span>
            <span className="pill">Greenhouse</span>
            <span className="pill">+ any site</span>
          </div>
        </div>
        <div className="sec-head reveal" ref={head.ref} style={headStyle}>
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
