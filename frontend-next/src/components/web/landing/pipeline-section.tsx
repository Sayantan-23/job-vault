'use client'

import { useReveal } from '@/components/web/landing/use-reveal'

// The single dark band ("the watch"): a flat hairline kanban (Applied /
// Interviewing / Offer). Each card carries a 7px freshness tick + mono
// day-count; the one stale card grows a vermilion left rule, a follow-up nudge,
// and a pulsing stale-dot. On reveal `useReveal` stamps `data-shown` on the
// band, which starts the stale-dot pulse via landing.css; the inner .wrap.reveal
// fades the content in. Under reduced motion the board resolves static (CSS).
export function PipelineSection() {
  const { ref: bandRef } = useReveal<HTMLElement>({ threshold: 0.3 })
  const { ref: wrapRef } = useReveal<HTMLDivElement>({ threshold: 0.2 })

  return (
    <section ref={bandRef} className="band-dark" id="pipeline">
      <div ref={wrapRef} className="wrap reveal">
        <div className="pipe-copy">
          <span className="eyebrow">The destination, watched</span>
          <h2>
            Nothing slips, <em>nothing goes cold</em>.
          </h2>
          <p className="deck">
            Every application lands in the pipeline carrying a freshness tick. Green while it is
            fresh, amber as it cools, red when it has gone quiet too long, with a nudge to follow
            up.
          </p>
        </div>
        <div className="board-wrap">
          <div className="board">
            <div className="col">
              <div className="col-head">
                <span className="name">Applied</span>
                <span className="count">6</span>
              </div>
              <div className="dcard" data-stale="">
                <div className="role">Product Designer</div>
                <div className="co">Ramp</div>
                <div className="meta">
                  <span className="stale-dot" /> quiet 14 days
                </div>
                <div className="nudge">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                  Send a follow-up
                </div>
              </div>
              <div className="dcard">
                <div className="role">Frontend Engineer</div>
                <div className="co">Loops</div>
                <div className="meta">
                  <span className="fdot c" /> quiet 5 days
                </div>
              </div>
            </div>
            <div className="col">
              <div className="col-head">
                <span className="name">Interviewing</span>
                <span className="count">3</span>
              </div>
              <div className="dcard">
                <div className="role">Product Engineer</div>
                <div className="co">Figment</div>
                <div className="meta">
                  <span className="fdot f" /> final round Thu
                </div>
              </div>
              <div className="dcard">
                <div className="role">UX Engineer</div>
                <div className="co">Aerial</div>
                <div className="meta">
                  <span className="fdot f" /> recruiter call done
                </div>
              </div>
            </div>
            <div className="col">
              <div className="col-head">
                <span className="name">Offer</span>
                <span className="count">1</span>
              </div>
              <div className="dcard">
                <div className="role">Frontend Engineer</div>
                <div className="co">Northwind</div>
                <div className="meta">
                  <span className="fdot f" /> reviewing terms
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
