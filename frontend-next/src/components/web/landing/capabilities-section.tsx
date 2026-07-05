'use client'

import type { CSSProperties } from 'react'

import { useReveal } from '@/components/web/landing/use-reveal'

// The whole-system wiring legend. Borderless single-column `.caps` of labeled
// terminals, each row carrying a mono term and a CSS junction dot (`.cap::before`).
// Each row also owns its own rail segment (`.cap::after`) in the left gutter:
// hovering/focusing a row lights BOTH its dot and its segment to accent. The
// stacked segments read as one continuous wire and stagger their draw-in on
// reveal via a per-row `--i` delay. Rows whose section exists render as anchors
// (`#pipeline`, `#personas`, `#documents`, `#extension`); Timeline & reminders
// lives inside #pipeline so it stays a plain div. No imperative SVG: the reveal
// only stamps `data-shown`, and reduced-motion is handled entirely in
// landing.css (segments static-lit, reveals snapped to their final state).
type Cap = {
  t: string
  term: string
  d: string
  href?: string
  fact?: string
}

const CAPS: Cap[] = [
  {
    t: 'Pipeline',
    term: 'track',
    d: 'Drag applications through Wishlist, Applied, Interviewing, and Offer.',
    href: '#pipeline',
  },
  {
    t: 'Personas',
    term: 'profile',
    d: 'Up to five role profiles, matched to the jobs you apply for.',
    href: '#personas',
    fact: 'up to 5',
  },
  {
    t: 'Résumés',
    term: 'generate',
    d: 'Tailored to each job and persona, with a library and PDF export.',
    href: '#documents',
    fact: 'PDF · LaTeX',
  },
  {
    t: 'Cover letters',
    term: 'generate',
    d: 'Human-sounding drafts you can refine, reuse, and export.',
    href: '#documents',
    fact: 'refine + export',
  },
  {
    t: 'Timeline & reminders',
    term: 'watch',
    d: 'Every step logged, with follow-ups and ghost alerts in real time.',
  },
  {
    t: 'Extension',
    term: 'capture',
    d: 'Save a posting from anywhere in one click, no copy-paste.',
    href: '#extension',
    fact: 'any site',
  },
]

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
          <div className="caps">
            {CAPS.map((c, i) => {
              const rowVars = { '--i': i }
              const rowStyle = rowVars as CSSProperties
              const inner = (
                <>
                  <div>
                    <div className="t">{c.t}</div>
                    <div className="term">{c.term}</div>
                  </div>
                  <div className="d">
                    <span>{c.d}</span>
                    {c.fact ? <span className="cap-fact">{c.fact}</span> : null}
                  </div>
                </>
              )
              return c.href ? (
                <a key={c.t} className="cap" href={c.href} style={rowStyle}>
                  {inner}
                </a>
              ) : (
                <div key={c.t} className="cap" style={rowStyle}>
                  {inner}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
