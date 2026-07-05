'use client'

import { useEffect, useRef } from 'react'
import { anchor, ns, type Point } from '@/components/web/landing/trace'
import { prefersReducedMotion } from '@/components/web/landing/use-reveal'

// PCB-style rounded polyline through an ordered list of waypoints: straight legs
// with a `r`-radius arc at every interior corner (clamped to half the shorter
// adjacent leg so tight elbows never overshoot). One path string, so a whole
// section hop animates/settles as a single stroke.
function polyRound(pts: Point[], r = 12): string {
  const first = pts[0]
  const last = pts[pts.length - 1]
  if (!first || !last || pts.length < 2) return ''
  let d = `M ${first.x} ${first.y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i]
    const prev = pts[i - 1]
    const next = pts[i + 1]
    if (!p || !prev || !next) continue
    const v1 = { x: p.x - prev.x, y: p.y - prev.y }
    const v2 = { x: next.x - p.x, y: next.y - p.y }
    const l1 = Math.hypot(v1.x, v1.y) || 1
    const l2 = Math.hypot(v2.x, v2.y) || 1
    const rr = Math.min(r, l1 / 2, l2 / 2)
    const a = { x: p.x - (v1.x / l1) * rr, y: p.y - (v1.y / l1) * rr }
    const b = { x: p.x + (v2.x / l2) * rr, y: p.y + (v2.y / l2) * rr }
    d += ` L ${a.x} ${a.y} Q ${p.x} ${p.y} ${b.x} ${b.y}`
  }
  return `${d} L ${last.x} ${last.y}`
}

/**
 * The connective spine — the page's signature circuit. One continuous
 * orthogonal trace threaded top-to-bottom through the whole landing column,
 * wrapper-relative and pinned over the sections (z-index above them, pointer
 * events off), routed through the empty margin gutters so it kisses each
 * section's visual anchor without ever crossing body text: it leaves the hero
 * stage, touches the steps rail's left dot, drops into the LEFT gutter past the
 * capture popup (meeting its left stub) and the persona fork node, crosses in
 * the fork/docs gap to the RIGHT gutter down to the docstage, runs the dark
 * pipeline band as an ink stroke, crosses back to the LEFT gutter past the
 * capabilities rail and the FAQ, and feeds the closing converge band. Every
 * section reads as one terminal on the same wire instead of an island.
 *
 * The route is built as one polyline per section hop off live anchor rects (so
 * gutter x's clamp into the real margins and full-width crossings land in the
 * inter-section gaps). Geometry re-derives on any wrapper resize (rAF-throttled
 * ResizeObserver, first callback no-op'd like the hero so a rebuild never wipes
 * a fresh pulse). A single IntersectionObserver watches the target sections;
 * the first time one reveals, its incoming segment runs one `flow` pulse then
 * settles energized (concurrency stays <=2 naturally). Under reduced motion
 * every segment lands lit instantly, no pulse. Hidden <=720px: the stacked
 * layout has no gutters, so the per-section vertical rails carry the metaphor.
 */
export function Spine() {
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const wrap = svg.parentElement // the .landing column
    if (!wrap) return

    const reduce = prefersReducedMotion()
    const mq = window.matchMedia('(max-width: 720px)')
    const v = 0.42 // px per ms — the current's constant travel speed (matches hero/fork)

    interface Seg {
      live: SVGPathElement
      section: Element | null
      fired: boolean
    }
    let segs: Seg[] = []
    const fired: boolean[] = [] // survives rebuilds so a settled segment stays lit
    const timeouts: ReturnType<typeof setTimeout>[] = []
    let io: IntersectionObserver | null = null

    const q = (sel: string) => wrap.querySelector<HTMLElement>(sel)
    // Element box in wrapper-local coords (both via getBoundingClientRect).
    const rel = (el: Element) => {
      const w = wrap.getBoundingClientRect()
      const r = el.getBoundingClientRect()
      return { l: r.left - w.left, t: r.top - w.top, r: r.right - w.left, b: r.bottom - w.top }
    }

    const settle = (live: SVGPathElement) => {
      live.classList.remove('flowing')
      live.classList.add('energized')
    }

    const pulse = (seg: Seg, i: number) => {
      if (seg.fired) return
      seg.fired = true
      fired[i] = true
      if (reduce) {
        settle(seg.live)
        return
      }
      const p = seg.live
      const len = Math.max(1, p.getTotalLength())
      const dur = len / v
      p.style.setProperty('--o0', `${len + 36}px`)
      p.style.animationDuration = `${dur}ms`
      // Restart the keyframe: force a reflow between class removal and re-add.
      p.classList.remove('flowing')
      p.getBoundingClientRect()
      p.classList.add('flowing')
      timeouts.push(setTimeout(() => settle(p), dur + 80))
    }

    // Re-derive the whole route from live anchor rects. Read every anchor first,
    // then write all paths, so layout flushes at most once.
    const build = () => {
      svg.innerHTML = ''
      segs = []
      if (mq.matches) return // no spine on the stacked mobile layout (CSS also hides it)

      const w = wrap.getBoundingClientRect()
      svg.setAttribute('viewBox', `0 0 ${w.width} ${w.height}`)

      const stage = q('#chain')
      const stepDot = q('.steps .step-dot')
      const capUnit = q('.cap-unit')
      const forkNode = q('#f-node')
      const docstage = q('.docstage')
      const board = q('.board')
      const capsWrap = q('.caps-wrap')
      const faq = q('.faq')
      const closing = q('.closing')
      const stepsSec = wrap.querySelector('.steps-strip')
      const capSec = wrap.querySelector('#extension')
      const forkSec = wrap.querySelector('#personas')
      const docsSec = wrap.querySelector('#documents')
      const pipeSec = wrap.querySelector('#pipeline')
      const capsSec = wrap.querySelector('#features')
      const faqSec = wrap.querySelector('#faq')
      const closeSec = wrap.querySelector('.closing')
      if (!stage || !stepDot || !capUnit || !forkNode || !docstage || !board || !capsWrap || !faq) {
        return
      }
      if (!closing || !docsSec || !pipeSec || !capsSec || !closeSec) return

      // Content edges + the two margin gutters the verticals run in (clamped so
      // they never leave the viewport at the narrow end of the 1180-1440 range).
      const contentL = anchor(wrap, capUnit, 'l').x
      const contentR = anchor(wrap, docstage, 'r').x
      const Lx = Math.max(14, contentL - 78)
      const Rx = Math.min(w.width - 14, contentR + 34)

      const pStage = anchor(wrap, stage, 'b')
      const dotTop = anchor(wrap, stepDot, 't')
      const dotBot = anchor(wrap, stepDot, 'b')
      const stepGap = dotBot.y + 6 // below the rail, above the step label
      const capY = anchor(wrap, capUnit, 'l').y
      const forkY = anchor(wrap, forkNode, 'l').y
      const docsY = anchor(wrap, docstage, 'r').y
      const boardY = anchor(wrap, board, 'r').y
      const pipeR = rel(pipeSec)
      const capsTop = rel(capsWrap).t
      const faqY = anchor(wrap, faq, 'l').y
      const pClose = anchor(wrap, closing, 't')
      // Full-width crossings ride the inter-section boundaries (each is the far
      // section's top == the near section's bottom, i.e. dead centre of the
      // combined padding gap, so nothing but field lives there).
      const gap1 = rel(docsSec).t // fork -> docs
      const gap2 = rel(capsSec).t // band -> capabilities
      const gap3 = rel(closeSec).t // faq -> closing
      const midY = (pStage.y + dotTop.y) / 2

      // Each hop is a rounded polyline; two band segments carry the ink stroke.
      const defs: Array<{ pts: Point[]; sec: Element | null; ink?: boolean }> = [
        {
          pts: [pStage, { x: pStage.x, y: midY }, { x: dotTop.x, y: midY }, dotTop],
          sec: stepsSec,
        },
        {
          pts: [dotTop, { x: dotTop.x, y: stepGap }, { x: Lx, y: stepGap }, { x: Lx, y: capY }],
          sec: capSec,
        },
        { pts: [{ x: Lx, y: capY }, { x: Lx, y: forkY }], sec: forkSec },
        {
          pts: [{ x: Lx, y: forkY }, { x: Lx, y: gap1 }, { x: Rx, y: gap1 }, { x: Rx, y: docsY }],
          sec: docsSec,
        },
        { pts: [{ x: Rx, y: docsY }, { x: Rx, y: pipeR.t }], sec: pipeSec },
        { pts: [{ x: Rx, y: pipeR.t }, { x: Rx, y: pipeR.b }], sec: pipeSec, ink: true },
        {
          pts: [{ x: Rx, y: pipeR.b }, { x: Rx, y: gap2 }, { x: Lx, y: gap2 }, { x: Lx, y: capsTop }],
          sec: capsSec,
        },
        { pts: [{ x: Lx, y: capsTop }, { x: Lx, y: faqY }], sec: faqSec },
        {
          pts: [{ x: Lx, y: faqY }, { x: Lx, y: gap3 }, { x: pClose.x, y: gap3 }, pClose],
          sec: closeSec,
        },
      ]

      defs.forEach((d, i) => {
        const dStr = polyRound(d.pts, 12)
        const base = ns('path')
        base.setAttribute('d', dStr)
        base.setAttribute('class', d.ink ? 'spine spine-ink' : 'spine')
        const live = ns('path')
        live.setAttribute('d', dStr)
        live.setAttribute('class', 'spine-live')
        svg.appendChild(base)
        svg.appendChild(live)
        if (reduce || fired[i]) settle(live)
        segs.push({ live, section: d.sec, fired: !!fired[i] })
      })

      // Functional solder junctions where the spine passes each section anchor.
      const dots: Point[] = [
        pStage,
        { x: Lx, y: capY },
        { x: Lx, y: forkY },
        { x: Rx, y: docsY },
        { x: Rx, y: boardY },
        { x: Lx, y: capsTop },
        pClose,
      ]
      for (const pt of dots) {
        const c = ns('circle')
        c.setAttribute('cx', String(pt.x))
        c.setAttribute('cy', String(pt.y))
        c.setAttribute('r', '3.5')
        c.setAttribute('class', 'junction')
        svg.appendChild(c)
      }
    }

    // Pulse each segment when its target section first crosses into view.
    const observeSections = () => {
      if (io || segs.length === 0) return
      if (typeof IntersectionObserver === 'undefined') {
        segs.forEach((s, i) => pulse(s, i))
        return
      }
      const sections = new Set<Element>()
      segs.forEach((s) => {
        if (s.section) sections.add(s.section)
      })
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (!e.isIntersecting) continue
            segs.forEach((s, i) => {
              if (s.section === e.target) pulse(s, i)
            })
            io?.unobserve(e.target)
          }
        },
        { threshold: 0.15 },
      )
      sections.forEach((sec) => io?.observe(sec))
    }

    // Rebuild on wrapper resize (page grows as reveals run / FAQ items open).
    let roFirst = true
    let resizeRaf = 0
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => {
        // The mandatory first RO callback lands after the initial rAF build; no-op
        // it so it can't wipe a freshly-built (or pulsing) wire.
        if (roFirst) {
          roFirst = false
          return
        }
        if (resizeRaf) return
        resizeRaf = requestAnimationFrame(() => {
          resizeRaf = 0
          build()
        })
      })
      ro.observe(wrap)
    }

    // Crossing the 720px breakpoint rebuilds (or clears) the spine; wire up the
    // observers if we just entered desktop having loaded on mobile.
    const onMq = () => {
      build()
      observeSections()
    }
    mq.addEventListener('change', onMq)

    const rafId = requestAnimationFrame(() => {
      build()
      observeSections()
    })

    return () => {
      cancelAnimationFrame(rafId)
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
      ro?.disconnect()
      io?.disconnect()
      mq.removeEventListener('change', onMq)
      timeouts.forEach((t) => clearTimeout(t))
    }
  }, [])

  return <svg className="spine-wires" ref={svgRef} aria-hidden="true" />
}
