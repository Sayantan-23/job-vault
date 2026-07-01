'use client'

import type { CSSProperties } from 'react'

import { useReveal } from '@/components/web/landing/use-reveal'

// The whole-system wiring legend. Borderless two-column `.caps` of labeled
// terminals, each row carrying a mono term and a CSS junction dot (`.cap::before`)
// that lights to accent on hover. The thin left `.rail` draws top-to-bottom on
// reveal (CSS `[data-shown] .rail`, transform-only), and the heading + legend
// fade up via `.reveal[data-shown]`. No imperative SVG: the reveals only stamp
// `data-shown`, and reduced-motion is handled entirely in landing.css (rail
// static-lit, reveals snapped to their final state).
export function CapabilitiesSection() {
  const head = useReveal<HTMLDivElement>()
  const caps = useReveal<HTMLDivElement>()

  // Reveal delay handed to landing.css via the `--rd` custom property (matches
  // the prototype's `style="--rd:90ms"`). CSSProperties doesn't type custom
  // props, so we widen via an identifier cast (the `consistent-type-assertions`
  // rule only bans assertions on object literals, not on a named const).
  const railVars = { '--rd': '90ms' }
  const capsStyle = railVars as CSSProperties

  return (
    <section id="features">
      <div className="wrap">
        <div className="sec-head reveal" ref={head.ref}>
          <span className="eyebrow">The whole system</span>
          <h2>
            Every part on the <em>same wire</em>.
          </h2>
        </div>
        <div className="caps-wrap reveal" ref={caps.ref} style={capsStyle}>
          <div className="rail" />
          <div className="caps">
            <div className="cap">
              <div>
                <div className="t">Pipeline</div>
                <div className="term">track</div>
              </div>
              <div className="d">
                Drag applications through Wishlist, Applied, Interviewing, and Offer.
              </div>
            </div>
            <div className="cap">
              <div>
                <div className="t">Personas</div>
                <div className="term">profile</div>
              </div>
              <div className="d">Up to five role profiles, matched to the jobs you apply for.</div>
            </div>
            <div className="cap">
              <div>
                <div className="t">Résumés</div>
                <div className="term">generate</div>
              </div>
              <div className="d">
                Tailored to each job and persona, with a library and PDF export.
              </div>
            </div>
            <div className="cap">
              <div>
                <div className="t">Cover letters</div>
                <div className="term">generate</div>
              </div>
              <div className="d">Human-sounding drafts you can refine, reuse, and export.</div>
            </div>
            <div className="cap">
              <div>
                <div className="t">Timeline &amp; reminders</div>
                <div className="term">watch</div>
              </div>
              <div className="d">
                Every step logged, with follow-ups and ghost alerts in real time.
              </div>
            </div>
            <div className="cap">
              <div>
                <div className="t">Extension</div>
                <div className="term">capture</div>
              </div>
              <div className="d">Save a posting from anywhere in one click, no copy-paste.</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
