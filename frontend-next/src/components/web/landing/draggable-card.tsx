'use client'

import { useSyncExternalStore, type ReactNode } from 'react'
import { motion } from 'motion/react'

/**
 * Drag is a garnish, not a feature: on low-end hardware (or software-composited
 * browsers) the per-frame transform updates stutter, so we only enable it on
 * machines that can afford it. Thresholds follow the common <4 GB / <4 cores
 * low-tier cut; deviceMemory is Chromium-only, so `undefined` counts as capable.
 */
function dragCapable(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  const nav = navigator as Navigator & { deviceMemory?: number }
  return (nav.deviceMemory ?? 8) >= 4 && (nav.hardwareConcurrency ?? 8) >= 4
}

// Read as an external store rather than in an effect: the server snapshot is
// `false` (inert markup, no hydration mismatch) and React picks up the real
// capability right after hydrating. The verdict is settled once per page load —
// it is fixed for the session, and a stable snapshot is what the store contract
// requires — so nothing ever notifies and `subscribe` has no work to do.
let capable: boolean | null = null
const getDragCapable = () => (capable ??= dragCapable())
const getServerSnapshot = () => false
const subscribe = () => () => {}

/**
 * DraggableCard — playful elastic drag for the hero collage cards. Zero-size
 * constraints + dragElastic give a rubber-band feel (the card trails the
 * pointer with resistance, ~100px max practical travel); on release it
 * springs back to its resting spot with a bounce. Enabled after mount so the
 * server render stays inert and low-end devices never pay for the drag layer.
 */
export function DraggableCard({
  children,
  elastic = 0.35,
}: {
  children: ReactNode
  /** Per-side drag give (motion dragElastic): higher = farther travel that way. */
  elastic?: number | { top?: number; left?: number; right?: number; bottom?: number }
}) {
  const enabled = useSyncExternalStore(subscribe, getDragCapable, getServerSnapshot)
  return (
    <motion.div
      className={enabled ? 'vc-drag' : undefined}
      drag={enabled}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={elastic}
      dragMomentum={false}
      dragTransition={{ bounceStiffness: 260, bounceDamping: 14 }}
      whileDrag={{ scale: 1.03 }}
    >
      {children}
    </motion.div>
  )
}
