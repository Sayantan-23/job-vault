'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { prefersReducedMotion, useReveal } from '@/components/web/landing/use-reveal'

// `CSSProperties` doesn't type CSS custom properties (the `--rd`/`--i` setters
// the prototype hands to landing.css). Cast through a parameter (not an inline
// object-literal assertion) so it satisfies @typescript-eslint/consistent-type-assertions.
function cssVars<T extends Record<string, string | number>>(vars: T): CSSProperties {
  return vars as CSSProperties
}

// DOCUMENTS (signature output): two type-set sheets, a rotated cover letter and
// a resume, both tailored "to: Senior PM · Ramp". On reveal the resume's
// doclines wipe in (clip-path, owned by landing.css via the `filled` class) and
// the vermilion TAILORED stamp scales in ~1.6s later with one overshoot (the
// `stamped` class). Reveal is play-once via useReveal; under reduced motion the
// lines + stamp resolve to their final state immediately (no choreography),
// mirroring the prototype's `if (reduce)` branch. Vermilion lives ONLY on the
// stamp + the struck refine line's underline (both from landing.css).
export function DocumentsSection() {
  const head = useReveal<HTMLDivElement>()
  const stage = useReveal<HTMLDivElement>({ threshold: 0.3 })
  const [filled, setFilled] = useState(false)
  const [stamped, setStamped] = useState(false)

  useEffect(() => {
    if (!stage.shown) return
    setFilled(true)
    if (prefersReducedMotion()) {
      setStamped(true)
      return
    }
    const id = window.setTimeout(() => setStamped(true), 1600)
    return () => window.clearTimeout(id)
  }, [stage.shown])

  const coverClass = `paper cover${filled ? ' filled' : ''}`
  const resumeClass = `paper resume${filled ? ' filled' : ''}${stamped ? ' stamped' : ''}`

  return (
    <section className="docs" id="documents">
      <div className="wrap">
        <div className="sec-head reveal" ref={head.ref}>
          <span className="eyebrow">The signature output</span>
          <h2>
            Drafts that read like <em>you wrote them</em>.
          </h2>
          <p>
            One persona and one job produce a tailored resume and cover letter, generated to fit the
            role. Refine the tone, keep a reusable library, and export to PDF.
          </p>
          <div className="refine-controls">
            <span className="rchip">Humanize</span>
            <span className="rchip">Shorten</span>
            <span className="rchip">Make longer</span>
            <span className="rchip">Fix grammar</span>
          </div>
        </div>
        <div
          className="docstage reveal"
          ref={stage.ref}
          style={cssVars({ '--rd': '60ms' })}
        >
          <div className={coverClass}>
            <div className="doctype">Cover letter</div>
            <div className="ctx">tailored to Ramp · Senior PM</div>
            <div className="ctext">
              Dear Hiring Team,
              <br />
              <br />
              Over the last six years I have shipped payments and spend products used by finance
              teams at scale, the exact problem space Ramp is built around.
            </div>
            <div className="ctext" style={{ marginTop: '8px' }}>
              I would bring that same focus on speed and clarity to your roadmap.
            </div>
            <div className="sign">Maya Okafor</div>
          </div>
          <div className={resumeClass}>
            <div className="doctype">Résumé</div>
            <div className="ctx">tailored to Ramp · Senior PM</div>
            <div className="cand">Maya Okafor</div>
            {/*
              GOTCHA 1: a bare `.contact` resolves to landing.css's global
              node-group contact-SHADOW (absolute, blurred radial gradient,
              pointer-events:none) which would clobber this resume contact line.
              Keep the class for the `.paper .contact` mono/faint type, but
              neutralize the floating-shadow geometry inline so it renders as
              normal-flow text.
            */}
            <div
              className="contact"
              style={cssVars({
                position: 'static',
                width: 'auto',
                height: 'auto',
                transform: 'none',
                background: 'none',
                filter: 'none',
                pointerEvents: 'auto',
              })}
            >
              maya.okafor@hey.com · San Francisco · /in/mayaokafor
            </div>
            <div className="seph">Experience</div>
            <div className="row">
              <span className="role">Senior Product Manager</span>
              <span className="when">2021–now</span>
            </div>
            <div className="biz">Brico · payments platform</div>
            <div className="docline" style={cssVars({ '--i': '80ms' })} />
            <div className="refine">
              <s>Worked on the billing system and helped the team.</s>
            </div>
            <div className="refine">
              <span className="new">Cut invoice errors 31% by rebuilding the billing engine.</span>
              <span className="tag">humanize</span>
            </div>
            <div className="docline" style={cssVars({ '--i': '220ms' })} />
            <div className="seph">Skills</div>
            <div className="docline" style={cssVars({ '--i': '300ms', width: '90%' })} />
            <div className="docline" style={cssVars({ '--i': '360ms', width: '72%' })} />
            <div className="corner-fold" title="Export PDF" />
            <svg className="stamp" viewBox="0 0 132 52" aria-hidden="true">
              <rect
                x="3"
                y="3"
                width="126"
                height="46"
                rx="7"
                fill="none"
                stroke="var(--vermilion)"
                strokeWidth="2.5"
              />
              <rect
                x="7.5"
                y="7.5"
                width="117"
                height="37"
                rx="4"
                fill="none"
                stroke="var(--vermilion)"
                strokeWidth="1"
              />
              <text
                x="66"
                y="32"
                textAnchor="middle"
                fontSize="17"
                fontWeight="600"
                letterSpacing="3.5"
                fill="var(--vermilion)"
              >
                TAILORED
              </text>
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}
