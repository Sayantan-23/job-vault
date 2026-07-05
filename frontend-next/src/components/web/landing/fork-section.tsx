'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import { anchor, ns, orth, type Point } from '@/components/web/landing/trace'
import { prefersReducedMotion, useReveal } from '@/components/web/landing/use-reveal'

// `CSSProperties` doesn't type CSS custom properties (the `--i`/`--rd` setters
// landing.css reads). Cast through a parameter (not an inline object-literal
// assertion) so it satisfies @typescript-eslint/consistent-type-assertions.
function cssVars<T extends Record<string, string | number>>(vars: T): CSSProperties {
  return vars as CSSProperties
}

/**
 * Personas fork — the "one persona, every tailored draft" beat. A single
 * Persona node on the left fans, through one code-built SVG, into four generated
 * document rows on the right (two résumés, two cover letters, different
 * companies). Each path is routed with `orth()` off live anchor rects and ends
 * in a junction dot on the row's left edge, so the wiring re-derives pixel-clean
 * on resize. On scroll-reveal the rows fade in top-to-bottom and each path
 * pulses once (staggered ~200ms so at most a couple travel at a time) before the
 * stage settles to its calm energized state. Under reduced motion everything
 * resolves straight to the lit final state, no traversal.
 *
 * At <=940px the CSS reflows into one column (node above, rows below) and hides
 * the fan; a static left rail on the rows carries the metaphor instead, so the
 * schematic survives without the horizontal wire overflowing narrow viewports.
 */
export function ForkSection() {
  const head = useReveal<HTMLDivElement>()
  const stageRef = useRef<HTMLDivElement | null>(null)
  const wiresRef = useRef<SVGSVGElement | null>(null)

  // One imperative effect owns the whole fork: build the fan geometry, re-derive
  // it on resize, and run the one-shot reveal pulse via its own
  // IntersectionObserver. Keeping build + pulse in a single closure (mirroring
  // the hero) avoids the in-view-at-load race where an IO-driven pulse could run
  // before the rAF build has populated the paths.
  useEffect(() => {
    const stageEl = stageRef.current
    const wires = wiresRef.current
    if (!stageEl || !wires) return

    const node = stageEl.querySelector<HTMLElement>('#f-node')
    const rows = Array.from(stageEl.querySelectorAll<HTMLElement>('.frow'))
    if (!node || rows.length === 0) return

    const reduce = prefersReducedMotion()
    let seg: SVGPathElement[] = []
    let dots: SVGCircleElement[] = []
    const timeouts: ReturnType<typeof setTimeout>[] = []
    let roFirst = true
    let ran = false
    let rafId = 0

    // Fan from the persona node's right edge to each row's left edge. Read every
    // anchor first, then write all paths, so layout flushes at most once.
    const buildFan = () => {
      const sr = stageEl.getBoundingClientRect()
      wires.setAttribute('viewBox', `0 0 ${sr.width} ${sr.height}`)
      wires.innerHTML = ''
      seg = []
      dots = []
      const from = anchor(stageEl, node, 'r')
      const tos: Point[] = rows.map((row) => anchor(stageEl, row, 'l'))
      tos.forEach((to) => {
        const d = orth(from, to, 12)
        const base = ns('path')
        base.setAttribute('d', d)
        base.setAttribute('class', 'trace')
        const live = ns('path')
        live.setAttribute('d', d)
        live.setAttribute('class', 'trace-live')
        const dot = ns('circle')
        dot.setAttribute('cx', String(to.x))
        dot.setAttribute('cy', String(to.y))
        dot.setAttribute('r', '3.5')
        dot.setAttribute('class', 'junction')
        wires.appendChild(base)
        wires.appendChild(live)
        wires.appendChild(dot)
        seg.push(live)
        dots.push(dot)
      })
    }

    // Stagger one `flow` current per path ~200ms apart (caps concurrency),
    // lighting each terminal junction as its current lands, then settle the
    // whole stage energized. Reduced motion resolves straight to lit.
    const runPulse = () => {
      if (reduce) {
        stageEl.classList.add('energized')
        dots.forEach((dot) => dot.classList.add('lit'))
        return
      }
      const v = 0.42 // px per ms — the current's constant travel speed
      let last = 0
      seg.forEach((p, i) => {
        const len = Math.max(1, p.getTotalLength())
        const dur = len / v
        const delay = i * 200
        p.style.setProperty('--o0', `${len + 36}px`)
        p.style.animationDuration = `${dur}ms`
        p.style.animationDelay = `${delay}ms`
        // Restart the keyframe: force a reflow between class removal and re-add.
        p.classList.remove('flowing')
        p.getBoundingClientRect()
        p.classList.add('flowing')
        const arrive = delay + dur
        last = Math.max(last, arrive)
        timeouts.push(setTimeout(() => dots[i]?.classList.add('lit'), arrive))
      })
      timeouts.push(setTimeout(() => stageEl.classList.add('energized'), last + 200))
    }

    // A resize rebuild after the reveal settles straight to the lit state rather
    // than re-clearing it (matches the hero relayout discipline).
    const relayout = () => {
      buildFan()
      if (ran) {
        stageEl.classList.add('energized')
        dots.forEach((dot) => dot.classList.add('lit'))
      }
    }

    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        // The mandatory first RO callback lands after the initial rAF build;
        // no-op it so it can't wipe a freshly-built (or pulsing) wire.
        if (roFirst) {
          roFirst = false
          return
        }
        relayout()
      })
      ro.observe(stageEl)
    }

    const reveal = () => {
      if (ran) return
      ran = true
      stageEl.setAttribute('data-shown', '') // CSS fades the rows in top-to-bottom
      buildFan() // fresh geometry right before the pulse (covers in-view-at-load)
      runPulse()
    }

    rafId = requestAnimationFrame(buildFan)

    let io: IntersectionObserver | null = null
    if (typeof IntersectionObserver === 'undefined') {
      reveal()
    } else {
      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue
            reveal()
            io?.unobserve(entry.target)
          }
        },
        { threshold: 0.2 },
      )
      io.observe(stageEl)
    }

    return () => {
      cancelAnimationFrame(rafId)
      ro?.disconnect()
      io?.disconnect()
      timeouts.forEach((t) => clearTimeout(t))
    }
  }, [])

  return (
    <section id="personas">
      <div className="wrap">
        <div className="sec-head reveal" ref={head.ref}>
          <h2>
            One persona. <em>Every tailored draft.</em>
          </h2>
          <p>
            Personas are role profiles, up to five, built from your master profile or imported from a
            résumé PDF.
          </p>
        </div>

        {/* THE FORK (all code-wired): one persona node -> four generated docs */}
        <div className="fork-stage reveal" ref={stageRef}>
          <svg className="fork-wires" ref={wiresRef} preserveAspectRatio="none" aria-hidden="true" />

          <div className="node fork-node" id="f-node">
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

          <div className="fork-rows">
            <div className="frow" style={cssVars({ '--i': '0ms' })}>
              <div className="fr-main">
                <div className="fr-title">Résumé for Ramp</div>
                <div className="fr-ctx">Senior PM · tailored</div>
              </div>
              <div className="fr-date">Jun 28</div>
            </div>
            <div className="frow" style={cssVars({ '--i': '90ms' })}>
              <div className="fr-main">
                <div className="fr-title">Cover letter for Loops</div>
                <div className="fr-ctx">Senior PM · refined</div>
              </div>
              <div className="fr-date">Jun 26</div>
            </div>
            <div className="frow" style={cssVars({ '--i': '180ms' })}>
              <div className="fr-main">
                <div className="fr-title">Résumé for Figment</div>
                <div className="fr-ctx">Senior PM · exported</div>
              </div>
              <div className="fr-date">Jun 22</div>
            </div>
            <div className="frow" style={cssVars({ '--i': '270ms' })}>
              <div className="fr-main">
                <div className="fr-title">Cover letter for Aerial</div>
                <div className="fr-ctx">Senior PM · draft</div>
              </div>
              <div className="fr-date">Jun 19</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
