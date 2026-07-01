'use client'

// Pure geometry helpers for the landing's hand-routed circuit traces, ported
// from the prototype <script>. No DOM mutation beyond `ns()` element creation;
// every section's animated SVG is built from these so the wiring stays
// pixel-aligned and reflows responsively.

export interface Point {
  x: number
  y: number
}

/** Which edge of an element to anchor a trace to. */
export type Side = 'r' | 'l' | 't' | 'b'

/**
 * Orthogonal, rounded path string between two points (PCB-style corners). When
 * the points share a horizontal line it degrades to a straight segment. `r` is
 * the corner radius (default 12px).
 */
export function orth(a: Point, b: Point, r = 12): string {
  if (Math.abs(a.y - b.y) < 3) return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
  const midX = (a.x + b.x) / 2
  const sy = b.y > a.y ? 1 : -1
  const sx = b.x > a.x ? 1 : -1
  return (
    `M ${a.x} ${a.y} L ${midX - r * sx} ${a.y} Q ${midX} ${a.y} ${midX} ${a.y + r * sy} ` +
    `L ${midX} ${b.y - r * sy} Q ${midX} ${b.y} ${midX + r * sx} ${b.y} L ${b.x} ${b.y}`
  )
}

/**
 * Vertical-dominant orthogonal path (the mobile/stacked analog of `orth`). The
 * trace leaves `a` heading down/up, jogs horizontally across the mid-line, then
 * resumes vertically into `b` (PCB-style rounded corners). When the two points
 * share a vertical line it degrades to a straight top-to-bottom segment, which
 * is the common case for the stacked hero (every node is centered, so the wire
 * is one clean vertical spine). `r` is the corner radius (default 12px).
 */
export function orthV(a: Point, b: Point, r = 12): string {
  if (Math.abs(a.x - b.x) < 3) return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
  const midY = (a.y + b.y) / 2
  const sy = b.y > a.y ? 1 : -1
  const sx = b.x > a.x ? 1 : -1
  return (
    `M ${a.x} ${a.y} L ${a.x} ${midY - r * sy} Q ${a.x} ${midY} ${a.x + r * sx} ${midY} ` +
    `L ${b.x - r * sx} ${midY} Q ${b.x} ${midY} ${b.x} ${midY + r * sy} L ${b.x} ${b.y}`
  )
}

/**
 * The anchor point on one side of `el`, expressed in `stage`-local coordinates
 * (both measured via getBoundingClientRect, so call after layout).
 */
export function anchor(stage: HTMLElement, el: HTMLElement, side: Side): Point {
  const s = stage.getBoundingClientRect()
  const e = el.getBoundingClientRect()
  const x = e.left - s.left
  const y = e.top - s.top
  const w = e.width
  const h = e.height
  switch (side) {
    case 'r':
      return { x: x + w, y: y + h / 2 }
    case 'l':
      return { x, y: y + h / 2 }
    case 't':
      return { x: x + w / 2, y }
    case 'b':
      return { x: x + w / 2, y: y + h }
  }
}

/** createElementNS helper for SVG elements, typed by tag name. */
export function ns<K extends keyof SVGElementTagNameMap>(name: K): SVGElementTagNameMap[K] {
  return document.createElementNS('http://www.w3.org/2000/svg', name)
}
