'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'

import { ns } from '@/components/web/landing/trace'
import { prefersReducedMotion, useReveal } from '@/components/web/landing/use-reveal'

// Closing CTA. Several faint traces curve in from the page edges and converge
// onto a single solder junction that sits ABOVE the headline (plan §7a: the
// prototype's traces cut through the glyphs; here the converge SVG is pinned to
// the section's top-padding band [height 124px, z-index 0] while the headline +
// CTA render at z-index 2, so the junction dot at y=124 clears the first
// headline line [padding-top 164px] by ~40px at every width). On reveal a final
// accent current pulses into the junction; geometry recomputes on resize;
// reduced-motion resolves straight to the settled converged state (lit dot +
// static traces, no pulse).
export function ClosingSection() {
  const { ref: wrapRef, shown } = useReveal<HTMLDivElement>({ threshold: 0.3 })
  const sectionRef = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!shown) return
    const svg = svgRef.current
    const section = sectionRef.current
    if (!svg || !section) return

    const reduce = prefersReducedMotion()
    const timers: number[] = []
    let raf = 0

    // Build the four edge-to-junction traces (+ the lit junction dot) sized to
    // the current SVG box; returns the live overlay paths for the flow pulse.
    const draw = (): SVGPathElement[] => {
      const r = svg.getBoundingClientRect()
      if (r.width === 0) return []
      const cx = r.width / 2
      const by = r.height
      svg.setAttribute('viewBox', `0 0 ${r.width} ${r.height}`)
      while (svg.firstChild) svg.removeChild(svg.firstChild)

      const xs = [40, r.width * 0.28, r.width * 0.72, r.width - 40]
      const lives: SVGPathElement[] = []
      for (const x of xs) {
        const d = `M ${x} 0 Q ${x} ${by * 0.6} ${cx} ${by}`
        const base = ns('path')
        base.setAttribute('d', d)
        base.setAttribute('class', 'trace-faint')
        const live = ns('path')
        live.setAttribute('d', d)
        live.setAttribute('class', 'trace-live')
        svg.appendChild(base)
        svg.appendChild(live)
        lives.push(live)
      }

      const dot = ns('circle')
      dot.setAttribute('cx', String(cx))
      dot.setAttribute('cy', String(by))
      dot.setAttribute('r', '5')
      dot.setAttribute('class', 'junction lit')
      svg.appendChild(dot)

      return lives
    }

    const run = () => {
      const lives = draw()
      if (lives.length === 0) return
      if (reduce) {
        // Settled converged state: traces lit static, no pulse.
        section.classList.add('energized')
        return
      }
      // The `flow` keyframe runs 0.62s; stagger the four traces by >0.62s/2 so
      // at most two animate their stroke-dashoffset concurrently (plan §5 cap).
      const step = 320
      lives.forEach((p, i) => {
        const len = p.getTotalLength()
        p.style.setProperty('--o0', `${len + 16}px`)
        p.style.animationDelay = `${i * step}ms`
        p.classList.add('flowing')
      })
      // Settle only after the last trace finishes flowing, so its pulse is not
      // cut short by the energized (dasharray:none) end state.
      const settle = (lives.length - 1) * step + 700
      timers.push(window.setTimeout(() => section.classList.add('energized'), settle))
    }

    // Measure after paint so the SVG box (and getTotalLength) are valid.
    raf = requestAnimationFrame(run)

    // Recompute geometry on resize; the traces are already energized, so the
    // rebuilt paths settle without re-firing the pulse. rAF-throttled so a drag
    // rebuilds the nodes at most once per frame, not once per resize event.
    let resizeRaf = 0
    const onResize = () => {
      if (resizeRaf) return
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0
        draw()
      })
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
      for (const t of timers) clearTimeout(t)
      window.removeEventListener('resize', onResize)
    }
  }, [shown])

  return (
    <section className="closing" ref={sectionRef}>
      <svg
        className="converge"
        id="converge"
        ref={svgRef}
        preserveAspectRatio="none"
        aria-hidden="true"
      />
      <div className="wrap reveal" ref={wrapRef}>
        <h2 className="serif">
          Start the search that <em>stays warm</em>.
        </h2>
        <div className="cta">
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
          <a className="btn btn-ghost" href="#extension">
            Add to Chrome
          </a>
        </div>
      </div>
    </section>
  )
}
