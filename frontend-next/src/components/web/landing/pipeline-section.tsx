'use client'

import { Clock, Timer, Ghost, Send } from 'lucide-react'
import { useReveal } from '@/components/web/landing/use-reveal'

// The single dark band ("the watch"): the page's one theme flip, gradient-seamed
// into the warm canvas top and bottom (no hard border). A flat hairline kanban
// (Applied / Interviewing / Offer) where each card carries the real GhostMeter
// tick (Clock green / Timer amber / Ghost rose + mono day-count); the one ghosted
// card grows a rose left rule, a follow-up nudge, and a pulsing ghost icon. On
// reveal `useReveal` stamps `data-shown` on the band, starting the ghost-icon +
// watchline pulses via landing.css; the inner .wrap.reveal fades content in.
// Under reduced motion the board resolves static (CSS). A giant clipped
// "JOBVAULT" wordmark sits at ~3% ink behind the board as texture.
export function PipelineSection() {
  const { ref: bandRef } = useReveal<HTMLElement>({ threshold: 0.3 })

  return (
    <section ref={bandRef} className="band-dark" id="pipeline">
      <p className="band-ghost" aria-hidden="true">
        JOBVAULT
      </p>
      <div className="wrap reveal">
        <div className="pipe-copy">
          <h2>
            Nothing slips, <em>nothing goes cold</em>.
          </h2>
          <p className="deck">
            Every application carries a freshness tick, and the board tells you the moment one needs
            a nudge.
          </p>
        </div>
        <div className="board-wrap">
          <div className="fresh-legend">
            <span className="legend-item">
              <span className="fdot f" /> fresh <span className="lg-range">0-3d</span>
            </span>
            <span className="legend-item">
              <span className="fdot c" /> cooling <span className="lg-range">4-9d</span>
            </span>
            <span className="legend-item">
              <span className="fdot x" /> cold <span className="lg-range">10d+</span>
            </span>
          </div>
          <div className="board">
            <div className="col">
              <div className="col-head">
                <span className="name">Applied</span>
                <span className="count">6</span>
              </div>
              <div className="dcard" data-ghosted="">
                <div className="role">Product Designer</div>
                <div className="co">Ramp · Remote</div>
                <div className="meta gm gm-ghosted">
                  <Ghost className="gm-icon" aria-hidden="true" />
                  <span className="gm-days">15d</span>
                </div>
                <div className="nudge">
                  <Send className="nudge-icon" aria-hidden="true" />
                  Send a follow-up
                </div>
              </div>
              <div className="dcard">
                <div className="role">Frontend Engineer</div>
                <div className="co">Loops · SF</div>
                <div className="meta gm gm-stale">
                  <Timer className="gm-icon" aria-hidden="true" />
                  <span className="gm-days">9d</span>
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
                <div className="co">Figment · Remote</div>
                <div className="meta gm gm-active">
                  <Clock className="gm-icon" aria-hidden="true" />
                  <span className="gm-days">2d</span>
                </div>
              </div>
              <div className="dcard">
                <div className="role">UX Engineer</div>
                <div className="co">Aerial · New York</div>
                <div className="meta gm gm-active">
                  <Clock className="gm-icon" aria-hidden="true" />
                  <span className="gm-days">3d</span>
                </div>
              </div>
            </div>
            <div className="col">
              <div className="col-head">
                <span className="name">Offer</span>
                <span className="count">2</span>
              </div>
              <div className="dcard">
                <div className="role">Frontend Engineer</div>
                <div className="co">Northwind · Remote</div>
                <div className="meta gm gm-active">
                  <Clock className="gm-icon" aria-hidden="true" />
                  <span className="gm-days">1d</span>
                </div>
              </div>
              <div className="dcard">
                <div className="role">Staff Engineer</div>
                <div className="co">Meridian Labs · Austin</div>
                <div className="meta gm gm-active">
                  <Clock className="gm-icon" aria-hidden="true" />
                  <span className="gm-days">3d</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="watchline">
          <div className="wl-rail">
            <div className="wl-event">
              <span className="wl-dot" />
              <span className="wl-label">saved via extension</span>
              <span className="wl-date">Jun 2</span>
            </div>
            <div className="wl-event">
              <span className="wl-dot lit" />
              <span className="wl-label">applied</span>
              <span className="wl-date">Jun 3</span>
            </div>
            <div className="wl-event">
              <span className="wl-dot lit" />
              <span className="wl-label">reminder set</span>
              <span className="wl-date">Jun 5</span>
            </div>
            <div className="wl-event">
              <span className="wl-dot ghost" />
              <span className="wl-label">quiet 15d · ghost alert</span>
              <span className="wl-date">Jun 17</span>
            </div>
            <div className="wl-event">
              <span className="wl-dot resolved" />
              <span className="wl-label">follow-up sent</span>
              <span className="wl-date">Jun 18</span>
            </div>
          </div>
          <p className="wl-caption">
            Every job keeps its own timeline. Reminders land in real time.
          </p>
        </div>
      </div>
    </section>
  )
}
