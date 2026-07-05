'use client'

import { useEffect, useId, useState, type CSSProperties } from 'react'
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
  const [refined, setRefined] = useState(false)
  const [stamped, setStamped] = useState(false)

  useEffect(() => {
    if (!stage.shown) return
    setFilled(true)
    if (prefersReducedMotion()) {
      setRefined(true)
      setStamped(true)
      return
    }
    // shown → lines fill → +700ms the AI-refine beat (chip lights, strikethrough
    // draws, replacement wipes in) → +1600ms the TAILORED stamp presses down.
    const t1 = window.setTimeout(() => setRefined(true), 700)
    const t2 = window.setTimeout(() => setStamped(true), 1600)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [stage.shown])

  // Unique-per-instance filter/mask ids (colons from useId break url(#…) refs).
  const uid = useId().replace(/:/g, '')
  const distressId = `stamp-distress-${uid}`
  const maskId = `stamp-mask-${uid}`

  // The stamp artwork, rendered twice: once as a blurred low-alpha ink-bleed
  // underlay, once as the masked/distressed ink on top. Reusing one element
  // reference keeps the two groups in lockstep.
  const stampArt = (
    <>
      <rect x="3" y="3" width="126" height="46" rx="7" fill="none" stroke="var(--vermilion)" strokeWidth="2.5" />
      <rect x="7.5" y="7.5" width="117" height="37" rx="4" fill="none" stroke="var(--vermilion)" strokeWidth="1" />
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
    </>
  )

  const coverClass = `paper cover${filled ? ' filled' : ''}`
  const resumeClass = `paper resume${filled ? ' filled' : ''}${refined ? ' refined' : ''}${stamped ? ' stamped' : ''}`

  return (
    <section className="docs" id="documents">
      <div className="wrap">
        <div className="sec-head reveal" ref={head.ref}>
          <h2>
            Drafts that read like <em>you wrote them</em>.
          </h2>
          <p>
            One persona and one job produce a tailored resume and cover letter, generated to fit the
            role. Refine the tone, keep a reusable library, and export to PDF.
          </p>
          <div className="refine-controls">
            <span className={`rchip${refined ? ' lit' : ''}`}>Humanize</span>
            <span className="rchip">Shorten</span>
            <span className="rchip">Make longer</span>
            <span className="rchip">Fix grammar</span>
          </div>
          <div className="exports">
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
              <span className="when">2021-now</span>
            </div>
            <div className="biz">Brico · payments platform</div>
            <div className="docline" style={cssVars({ '--i': '80ms' })} />
            <div className="refine">
              <s>Worked on the billing system and helped the team.</s>
            </div>
            <div className="refine repl">
              <span className="new">Cut invoice errors 31% by rebuilding the billing engine.</span>
              <span className="tag">humanize</span>
            </div>
            <div className="docline" style={cssVars({ '--i': '220ms' })} />
            <div className="seph">Skills</div>
            <div className="docline" style={cssVars({ '--i': '300ms', width: '90%' })} />
            <div className="docline" style={cssVars({ '--i': '360ms', width: '72%' })} />
            <div className="corner-fold" title="Export PDF" />
            <svg className="stamp" viewBox="0 0 132 52" aria-hidden="true">
              <defs>
                {/* Distressed ink: fractal-noise displacement erodes the crisp
                    vector edges so strokes look pressed and broken, not printed. */}
                <filter id={distressId} x="-20%" y="-20%" width="140%" height="140%">
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency="0.9"
                    numOctaves="2"
                    seed="7"
                    result="noise"
                  />
                  <feDisplacementMap
                    in="SourceGraphic"
                    in2="noise"
                    scale="2.6"
                    xChannelSelector="R"
                    yChannelSelector="G"
                  />
                </filter>
                {/* Uneven ink pressure: top-right prints solid, the far corner
                    fades to ~60% so the impression isn't machine-even. */}
                <radialGradient id={`${maskId}-grad`} cx="74%" cy="24%" r="92%">
                  <stop offset="0%" stopColor="#fff" stopOpacity="1" />
                  <stop offset="55%" stopColor="#fff" stopOpacity="0.94" />
                  <stop offset="100%" stopColor="#fff" stopOpacity="0.6" />
                </radialGradient>
                <mask id={maskId}>
                  <rect width="132" height="52" fill={`url(#${maskId}-grad)`} />
                </mask>
              </defs>
              {/* Ink bleed: a blurred, faint duplicate haloing the impression. */}
              <g className="stamp-bleed">{stampArt}</g>
              <g filter={`url(#${distressId})`} mask={`url(#${maskId})`}>
                {stampArt}
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}
