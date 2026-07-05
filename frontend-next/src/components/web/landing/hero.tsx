'use client'

import { type CSSProperties } from 'react'
import Link from 'next/link'

// `CSSProperties` doesn't type CSS custom properties (the `--d`/`--i` setters
// landing.css reads). Cast through a parameter (not an inline object-literal
// assertion) so it satisfies @typescript-eslint/consistent-type-assertions.
function cssVars<T extends Record<string, string | number>>(vars: T): CSSProperties {
  return vars as CSSProperties
}

/**
 * Hero — copy stack plus a static composed stage: a Persona node, an
 * extension-captured Job, the tailored Résumé + Cover-letter sheets, and the
 * Applied pipeline card. The copy rides the CSS `.intro` load stagger.
 *
 * ponytail: no wiring / choreography — T3 replaces this stage wholesale. The
 * sheets ship with `filled` and the pipe with `dropped` so their lines/card
 * render in their final visible state without any JS.
 */
export function Hero() {
  return (
    <header className="hero" id="how">
      <div className="wrap">
        <div className="hero-copy">
          <span className="eyebrow intro" style={cssVars({ '--d': '0ms' })}>
            One connected system
          </span>
          <h1 className="intro" style={cssVars({ '--d': '80ms' })}>
            One search.
            <br />
            <em>Wired end to end.</em>
          </h1>
          <p className="deck intro" style={cssVars({ '--d': '180ms' })}>
            A persona and a job become a tailored resume and cover letter, tracked in one pipeline
            and watched so nothing goes cold.
          </p>
          <div className="cta intro" style={cssVars({ '--d': '280ms' })}>
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
            <a className="btn btn-ghost" href="#documents">
              See the documents
            </a>
          </div>
        </div>

        {/* Static composed stage (no wiring) */}
        <div className="stage intro" id="chain" style={cssVars({ '--d': '360ms' })}>
          <div className="node" id="n-persona" style={{ left: 0, top: 40, width: 178 }}>
            <div className="nlabel">Persona</div>
            <div className="nhead">
              <span className="nmono">M</span>
              <div className="ntitle">Senior PM</div>
            </div>
            <div className="nchips">
              <span className="nchip">Product</span>
              <span className="nchip">Roadmap</span>
              <span className="nchip">SQL</span>
            </div>
            <div className="nmeta" style={{ color: 'var(--accent-strong)' }}>
              3 / 5 used
            </div>
          </div>

          <div className="node" id="n-job" style={{ left: 0, top: 214, width: 178 }}>
            <div className="nlabel">Job</div>
            <div className="ntitle">Senior PM</div>
            <div className="nmeta">Ramp · San Francisco</div>
            <div className="nmeta">$160-190k · hybrid</div>
            <span className="tap">via extension</span>
          </div>

          <div
            className="sheetgroup"
            id="n-docs"
            style={{ left: 292, top: 14, width: 276, height: 232 }}
          >
            <div
              className="sheet cover filled"
              style={{ left: 0, top: 26, width: 150, height: 188, transform: 'rotate(-7deg)' }}
            >
              <div className="stype">Cover letter</div>
              <div className="lines">
                <div className="ln" style={cssVars({ '--i': '60ms', width: '92%' })} />
                <div className="ln" style={cssVars({ '--i': '120ms', width: '86%' })} />
                <div className="ln" style={cssVars({ '--i': '180ms', width: '94%' })} />
                <div className="ln" style={cssVars({ '--i': '240ms', width: '70%' })} />
                <div className="ln" style={cssVars({ '--i': '300ms', width: '88%' })} />
              </div>
            </div>
            <div
              className="sheet resume filled"
              style={{ left: 100, top: 0, width: 172, height: 220, transform: 'rotate(2deg)' }}
            >
              <div className="shead">
                <span className="stype">Résumé</span>
                <span className="sdate">2021-now</span>
              </div>
              <div className="sname">Maya Okafor</div>
              <div className="sctx">tailored to Ramp · Senior PM</div>
              <div className="lines">
                <div className="ln" style={cssVars({ '--i': '80ms', width: '96%' })} />
                <div className="ln" style={cssVars({ '--i': '150ms', width: '88%' })} />
                <div className="ln accent" style={cssVars({ '--i': '220ms', width: '64%' })} />
                <div className="ln" style={cssVars({ '--i': '290ms', width: '92%' })} />
                <div className="ln" style={cssVars({ '--i': '360ms', width: '78%' })} />
              </div>
            </div>
          </div>

          <div className="pipe dropped" id="n-pipe" style={{ left: 314, top: 282, width: 236 }}>
            <div className="ptop">
              <span className="pname">Applied</span>
              <span className="pcount">+1</span>
            </div>
            <div className="pcards">
              <div className="pcard" style={{ transitionDelay: '0ms' }}>
                <div className="prole">Senior PM</div>
                <div className="pco">Ramp</div>
                <div className="ptick">
                  <span className="fdot f" /> tracked just now
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
