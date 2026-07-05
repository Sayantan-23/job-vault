'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import Link from 'next/link'
import { anchor, ns, orth, orthV, type Side } from '@/components/web/landing/trace'
import { prefersReducedMotion } from '@/components/web/landing/use-reveal'

// `CSSProperties` doesn't type CSS custom properties (the `--d`/`--i` setters
// the prototype hands to landing.css). Cast through a parameter (not an inline
// object-literal assertion) so it satisfies @typescript-eslint/consistent-type-assertions.
function cssVars<T extends Record<string, string | number>>(vars: T): CSSProperties {
  return vars as CSSProperties
}

/**
 * Hero — the signature live signal chain. A Persona node and an
 * extension-captured Job feed a forking junction that energizes a tailored
 * Résumé + Cover-letter (filling line-by-line) which recombine into the
 * Pipeline where a card drops into Applied. On mount one ~2.2s accent current
 * traverses the whole path in real product order, lighting each node, then the
 * stage settles to a calm energized state. Traces re-derive from live anchor
 * rects on resize so the wiring stays pixel-aligned. Under reduced motion every
 * node resolves straight to its final lit/filled/dropped state, no traversal.
 *
 * At <=720px the CSS reflows the absolutely-positioned nodes into a centered
 * vertical stack (Persona -> Job -> fork -> Résumé + Cover-letter -> Pipeline);
 * this effect detects that mode via matchMedia and routes the wire as a single
 * top-to-bottom spine (`orthV`) instead of the horizontal desktop anchors. The
 * on-load pulse runs in whichever mode the page loads in; crossing the
 * breakpoint later rebuilds the wire in the new orientation and settles it to
 * the lit state. Mode is re-read live on every relayout, so no stale geometry.
 */
export function Hero() {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const wiresRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const stage = stageRef.current
    const wires = wiresRef.current
    if (!stage || !wires) return

    const persona = stage.querySelector<HTMLElement>('#n-persona')
    const job = stage.querySelector<HTMLElement>('#n-job')
    const fork = stage.querySelector<HTMLElement>('#n-fork')
    const docs = stage.querySelector<HTMLElement>('#n-docs')
    const pipe = stage.querySelector<HTMLElement>('#n-pipe')
    if (!persona || !job || !fork || !docs || !pipe) return
    const sheets = Array.from(docs.querySelectorAll<HTMLElement>('.sheet'))

    const reduce = prefersReducedMotion()
    // <=720px flips the chain into the stacked vertical routing; re-read live on
    // every (re)build so crossing the breakpoint reroutes the wire without a
    // full remount.
    const mq = window.matchMedia('(max-width: 720px)')
    const seg: SVGPathElement[] = []
    const timeouts: ReturnType<typeof setTimeout>[] = []
    let chainRan = false
    let roFirst = true
    let rafId = 0

    // Re-derive every trace <path> from the live node anchor rects. Horizontal
    // desktop routing (Persona/Job -> fork -> Docs -> Pipe via `orth`) or, when
    // stacked, a single top-to-bottom spine threading each node in order (via
    // `orthV`), which is what the reflowed vertical layout reads as.
    const buildChain = () => {
      const stacked = mq.matches
      const sr = stage.getBoundingClientRect()
      wires.setAttribute('viewBox', `0 0 ${sr.width} ${sr.height}`)
      wires.innerHTML = ''
      seg.length = 0
      const conns: Array<[HTMLElement, Side, HTMLElement, Side]> = stacked
        ? [
            [persona, 'b', job, 't'],
            [job, 'b', fork, 't'],
            [fork, 'b', docs, 't'],
            [docs, 'b', pipe, 't'],
          ]
        : [
            [persona, 'r', fork, 'l'],
            [job, 'r', fork, 'l'],
            [fork, 'r', docs, 'l'],
            [docs, 'b', pipe, 't'],
          ]
      const route = stacked ? orthV : orth
      // Read all geometry first, then write all paths — never interleave an
      // anchor rect read after an appendChild, so layout flushes at most once.
      const ds = conns.map(([fromEl, fromSide, toEl, toSide]) =>
        route(anchor(stage, fromEl, fromSide), anchor(stage, toEl, toSide), 12),
      )
      for (const d of ds) {
        const base = ns('path')
        base.setAttribute('d', d)
        base.setAttribute('class', 'trace')
        const live = ns('path')
        live.setAttribute('d', d)
        live.setAttribute('class', 'trace-live')
        wires.appendChild(base)
        wires.appendChild(live)
        seg.push(live)
      }
    }

    // One continuous current at a CONSTANT speed: each segment's duration is
    // proportional to its length, and each starts exactly when the pulse reaches
    // its origin junction, so the light flows smoothly end-to-end without
    // stalling between segments. Desktop feeds the fork from Persona + Job in
    // parallel, then fork -> docs -> pipe; the stacked spine runs one segment at
    // a time down the wire, lighting each node as the current arrives.
    const runChain = () => {
      if (reduce) {
        stage.classList.add('energized')
        persona.classList.add('lit')
        job.classList.add('lit')
        fork.classList.add('lit')
        sheets.forEach((s) => s.classList.add('filled'))
        pipe.classList.add('dropped')
        return
      }
      const [s0, s1, s2, s3] = seg
      if (!s0 || !s1 || !s2 || !s3) return
      const v = 0.42 // px per ms — the current's constant travel speed
      const l0 = Math.max(1, s0.getTotalLength())
      const l1 = Math.max(1, s1.getTotalLength())
      const l2 = Math.max(1, s2.getTotalLength())
      const l3 = Math.max(1, s3.getTotalLength())

      const flow = (p: SVGPathElement, delay: number, dur: number) => {
        p.style.setProperty('--o0', `${p.getTotalLength() + 36}px`)
        p.style.animationDuration = `${dur}ms`
        p.style.animationDelay = `${delay}ms`
        // Restart the keyframe: force a reflow between class removal and re-add.
        p.classList.remove('flowing')
        p.getBoundingClientRect()
        p.classList.add('flowing')
      }
      const at = (fn: () => void, t: number) => timeouts.push(setTimeout(fn, t))

      if (mq.matches) {
        const t0 = 200
        const t1 = t0 + l0 / v
        const t2 = t1 + l1 / v
        const t3 = t2 + l2 / v
        const end = t3 + l3 / v
        flow(s0, t0, l0 / v)
        flow(s1, t1, l1 / v)
        flow(s2, t2, l2 / v)
        flow(s3, t3, l3 / v)
        at(() => persona.classList.add('lit'), t0)
        at(() => job.classList.add('lit'), t1)
        at(() => fork.classList.add('lit'), t2)
        at(() => sheets.forEach((s) => s.classList.add('filled')), t3)
        at(() => pipe.classList.add('dropped'), end)
        at(() => stage.classList.add('energized'), end + 220)
      } else {
        const t0 = 250
        const forkArrive = t0 + Math.max(l0, l1) / v
        const docsArrive = forkArrive + l2 / v
        const pipeArrive = docsArrive + l3 / v
        flow(s0, t0, l0 / v)
        flow(s1, t0, l1 / v)
        flow(s2, forkArrive, l2 / v)
        flow(s3, docsArrive, l3 / v)
        at(() => {
          persona.classList.add('lit')
          job.classList.add('lit')
        }, t0)
        at(() => fork.classList.add('lit'), forkArrive)
        at(() => sheets.forEach((s) => s.classList.add('filled')), docsArrive)
        at(() => pipe.classList.add('dropped'), pipeArrive)
        at(() => stage.classList.add('energized'), pipeArrive + 220)
      }
    }

    // Rebuild the wire (in the current mode's orientation) and, once the initial
    // pulse has run, settle it straight to the lit state — no re-traversal.
    const relayout = () => {
      buildChain()
      if (chainRan) stage.classList.add('energized')
    }

    // Reflow traces on resize; settle to energized once the run has happened.
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        // The mandatory initial ResizeObserver callback is delivered AFTER the
        // rAF that kicks off the chain (per the HTML rendering-update ordering),
        // so it must be a pure no-op — otherwise its buildChain() would wipe the
        // freshly-created `flowing` paths and silently kill the hero pulse. The
        // rAF's own buildChain always builds the chain, so skipping here is safe
        // regardless of which fires first.
        if (roFirst) {
          roFirst = false
          return
        }
        relayout()
      })
      ro.observe(stage)
    }

    // Crossing the 720px breakpoint reroutes the wire (horizontal <-> vertical).
    // The ResizeObserver also fires on the reflow, but this makes the mode switch
    // explicit and reroutes even if the stage box happens not to change size.
    mq.addEventListener('change', relayout)

    rafId = requestAnimationFrame(() => {
      buildChain()
      if (!chainRan) {
        chainRan = true
        runChain()
      }
    })

    return () => {
      cancelAnimationFrame(rafId)
      ro?.disconnect()
      mq.removeEventListener('change', relayout)
      timeouts.forEach((t) => clearTimeout(t))
    }
  }, [])

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

        {/* THE LIVE SIGNAL CHAIN (all code-built) */}
        <div className="stage intro" id="chain" ref={stageRef} style={cssVars({ '--d': '360ms' })}>
          <svg
            className="wires"
            id="wires"
            ref={wiresRef}
            preserveAspectRatio="none"
            aria-hidden="true"
          />

          <div className="node" id="n-persona" style={{ left: 0, top: 40, width: 182 }}>
            <div className="nlabel">Persona</div>
            <div className="ntitle">Senior PM</div>
            <div className="nmeta">skills · salary · experience</div>
            <div className="nmeta" style={{ color: 'var(--accent-strong)' }}>
              3 / 5 used
            </div>
          </div>

          <div className="node" id="n-job" style={{ left: 0, top: 262, width: 182 }}>
            <div className="nlabel">Job</div>
            <div className="ntitle">Senior PM</div>
            <div className="nmeta">Ramp · San Francisco</div>
            <span className="tap">via extension</span>
          </div>

          <div className="fork" id="n-fork" style={{ left: 268, top: 208 }}>
            <div className="jdot" />
          </div>

          <div
            className="sheetgroup"
            id="n-docs"
            style={{ left: 332, top: 8, width: 250, height: 240 }}
          >
            <div
              className="sheet cover"
              style={{ left: 0, top: 18, width: 160, height: 200, transform: 'rotate(3deg)' }}
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
              className="sheet resume"
              style={{ left: 74, top: 0, width: 172, height: 222, transform: 'rotate(-1.6deg)' }}
            >
              <div className="shead">
                <span className="stype">Résumé</span>
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

          <div className="pipe" id="n-pipe" style={{ left: 356, top: 300, width: 236 }}>
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
