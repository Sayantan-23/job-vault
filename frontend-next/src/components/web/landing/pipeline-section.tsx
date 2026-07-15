'use client'

import { useCallback, useRef } from 'react'
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionStyle,
  type MotionValue,
} from 'motion/react'
import { Clock, Timer, Ghost, Send } from 'lucide-react'
import { useReveal } from '@/components/web/landing/use-reveal'

// The one theme flip: an INSET ROUNDED DARK PANEL floating on the warm canvas
// (Floria-style), not a full-bleed band. No gradient seams; the panel carries
// its own atmosphere — a faint vertical ink gradient plus a subtle indigo glow
// (`.band-dark::before`) — and a giant clipped "JOBVAULT" wordmark sitting on the
// panel's bottom edge as ~3.5% texture, cropped by the rounded corners.
//
// A flat hairline kanban (Applied / Interviewing / Offer) where each card carries
// the real GhostMeter tick (Clock green / Timer amber / Ghost rose + mono
// day-count); the one ghosted card grows a rose left rule, a follow-up nudge, and
// a pulsing ghost icon. `useReveal` stamps `data-shown` on the panel, starting the
// ghost-icon + watchline pulses via landing.css; the inner .wrap.reveal fades
// content in. Under reduced motion the board resolves static (CSS).
//
// Scroll-linked entrance: `useScroll`/`useTransform` scale the panel 0.9 -> 1 and
// tip it from rotateX(-8deg) -> 0 (top edge toward the viewer, settling flat) as
// it enters view (transform-only, cheap). The border-radius eases 40 -> settled on
// reveal via CSS (`.band-dark[data-shown]`) so it stays breakpoint-aware (20px on
// mobile) and no-JS-safe. Guarded by `useReducedMotion` (reduced = static final
// state). No opacity is ever touched, so no-JS/`scripting:none` renders content
// fully visible.
// `MotionStyle` doesn't type CSS custom-property keys (motion supports them at
// runtime); cast through a parameter, mirroring hero.tsx's cssVars.
function motionVars(vars: Record<string, MotionValue<number>>): MotionStyle {
  return vars as MotionStyle
}

export function PipelineSection() {
  const { ref: revealRef } = useReveal<HTMLDivElement>({ threshold: 0.3 })
  const watchlineRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const reduce = useReducedMotion()

  // One node drives both the reveal observer and the scroll target.
  const setPanel = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node
      revealRef.current = node
    },
    [revealRef],
  )

  const { scrollYProgress } = useScroll({
    target: panelRef,
    offset: ['start end', 'center center'],
  })
  const scale = useTransform(scrollYProgress, [0, 1], [0.9, 1])
  // Top edge tilted toward the viewer (card revealed face-up), settling flat.
  const rotateX = useTransform(scrollYProgress, [0, 1], [-8, 0])

  // Watchline draw is scroll-scrubbed (not time-based): 0 when the strip incl.
  // its caption has just entered the viewport bottom, 1 when the strip's
  // center reaches 65% down the viewport (a touch before the middle). The
  // progress lands as a `--wl-p` CSS var; landing.css maps it to the wire's
  // scaleX and each dot's clamp() ramp, so scrolling back un-draws it.
  const { scrollYProgress: wlProgress } = useScroll({
    target: watchlineRef,
    offset: ['end end', 'center 0.65'],
  })
  const watchlineStyle = motionVars({ '--wl-p': wlProgress })

  return (
    <section className="pipeline" id="pipeline">
      <motion.div
        ref={setPanel}
        className="band-dark"
        style={reduce ? {} : { scale, rotateX, transformPerspective: 1200 }}
      >
        <p className="band-ghost" aria-hidden="true">
          JOBVAULT
        </p>
        <div className="wrap reveal">
          <div className="pipe-copy">
            <h2>
              Nothing slips, <em>nothing goes cold.</em>
            </h2>
            <p className="deck">
              Every application carries a freshness tick, and the board tells you the moment one
              needs a nudge.
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
          <motion.div
            className="watchline"
            ref={watchlineRef}
            style={reduce ? {} : watchlineStyle}
          >
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
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
