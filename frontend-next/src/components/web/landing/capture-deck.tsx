'use client'

import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import {
  motion,
  useAnimate,
  useInView,
  useReducedMotion,
  type PanInfo,
} from 'motion/react'
import { MiniExtensionPopup } from '@/components/web/landing/mini/extension-popup'

// A 2-card deck (capture + success popups) the user can grab and swap.
//
// Resting composition (also the SSR / no-JS / reduced-motion state, set in CSS
// on `.ext-layer--capture` [back] and `.ext-layer--success` [front]): success
// on top, offset down-right, capture receded behind (dimmed + scaled). Every
// transform below is applied imperatively by motion after hydration, so it can
// override the CSS resting styles without fighting them.
//
// Entrance (first in-view, motion allowed): capture alone for a beat, then the
// success card slides in from the right on top. After that the deck is
// interactive: the TOP card
// is draggable (a nested drag surface with `dragSnapToOrigin`), and dragging it
// past a threshold swaps it to the back while the other card springs forward.
type Card = 'capture' | 'success'

// Deck slots. `x`/`y` are translate (motion writes them as transform, matching
// the CSS resting transforms so hand-off is seamless). Front sits offset
// down-right at full size; back sits at origin, slightly scaled. Both cards
// stay fully opaque — depth comes from the scale step, the offset, and the
// heavier shadow on the top card (`ext-layer--top`). zIndex flips instantly
// (not through the spring) so stacking is never ambiguous mid-animation.
// `opacity: 1` is kept in the slots so a swap heals the entrance's fade-in
// if the user grabs the card mid-entrance.
const FRONT = { x: 24, y: 24, scale: 1, opacity: 1 }
const BACK = { x: 0, y: 0, scale: 0.95, opacity: 1 }

// A drag counts as a swap past ~120px horizontal travel or a firm flick.
const SWAP_DISTANCE = 120
const SWAP_VELOCITY = 500

const SPRING = { type: 'spring', stiffness: 320, damping: 30 } as const

// How long capture sits alone before success slides in. Short — long enough
// to register the "before" state, not so long the user scrolls past it.
const BEAT = 0.6

export function CaptureDeck() {
  const [scope, animate] = useAnimate<HTMLDivElement>()
  // Low threshold so the beat starts as soon as the deck peeks in — the
  // entrance must finish before the user can scroll past the section.
  const inView = useInView(scope, { once: true, amount: 0.25 })
  const reduce = useReducedMotion()

  const captureRef = useRef<HTMLDivElement | null>(null)
  const successRef = useRef<HTMLDivElement | null>(null)
  // Which card is currently on top. Starts on `success` so the resting state
  // (and SSR) reads as the finished stacked composition.
  const [top, setTop] = useState<Card>('success')
  // Gates the swap effect until the deck has settled into its resting slots
  // (after the entrance, or immediately when motion is reduced).
  const entered = useRef(false)

  // Entrance drop, played once when the deck scrolls into view.
  useEffect(() => {
    if (entered.current) return
    const cap = captureRef.current
    const suc = successRef.current
    if (!cap || !suc) return

    if (reduce || !inView) {
      // Reduced motion: stay on the CSS resting state, just open for drags.
      // Not-yet-in-view: leave the CSS resting state untouched until reveal.
      if (reduce) entered.current = true
      return
    }

    // The pre-set MUST be awaited before the delayed animations start: a
    // later `animate` on the same properties interrupts an unfinished
    // duration-0 one before it commits, so a same-tick sequence samples the
    // resting values as the spring's start and the entrance never shows.
    const run = async () => {
      // Pre-entrance: capture alone (full), success parked off to the right.
      await Promise.all([
        animate(cap, { x: 0, y: 0, scale: 1, opacity: 1, zIndex: 1 }, { duration: 0 }),
        animate(suc, { x: 200, y: 24, scale: 1, opacity: 0, zIndex: 2 }, { duration: 0 }),
      ])
      // The beat, then the swap: capture recedes while success slides in from
      // the right on top. Opacity ramps on a quick tween (not the spring) so
      // the card is fully visible for most of its travel — the slide reads.
      animate(cap, BACK, { ...SPRING, delay: BEAT })
      animate(
        suc,
        { x: 24, y: 24, opacity: 1 },
        { ...SPRING, delay: BEAT, opacity: { delay: BEAT, duration: 0.25, ease: 'easeOut' } },
      )
    }
    void run()
    entered.current = true
  }, [inView, reduce, animate])

  // Swap: animate both cards to their new slots when `top` flips.
  useEffect(() => {
    if (!entered.current) return
    const cap = captureRef.current
    const suc = successRef.current
    if (!cap || !suc) return
    const transition = reduce ? { duration: 0 } : SPRING
    const capFront = top === 'capture'
    // z-order flips immediately so the incoming card is unambiguously on top
    // while both cards travel to their slots.
    animate(cap, { zIndex: capFront ? 2 : 1 }, { duration: 0 })
    animate(suc, { zIndex: capFront ? 1 : 2 }, { duration: 0 })
    animate(cap, capFront ? FRONT : BACK, transition)
    animate(suc, capFront ? BACK : FRONT, transition)
  }, [top, reduce, animate])

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (Math.abs(info.offset.x) > SWAP_DISTANCE || Math.abs(info.velocity.x) > SWAP_VELOCITY) {
      setTop((t) => (t === 'capture' ? 'success' : 'capture'))
    }
    // Below threshold: `dragSnapToOrigin` springs the card back on its own.
  }

  return (
    <div className="ext-stage" ref={scope}>
      <Deck cardRef={captureRef} card="capture" isTop={top === 'capture'} onDragEnd={handleDragEnd}>
        {/* Capture is the finished-hidden layer once success lands on top. */}
        <MiniExtensionPopup size="full" state="capture" />
      </Deck>
      <Deck cardRef={successRef} card="success" isTop={top === 'success'} onDragEnd={handleDragEnd}>
        <MiniExtensionPopup size="full" state="success" />
      </Deck>
    </div>
  )
}

function Deck({
  cardRef,
  card,
  isTop,
  onDragEnd,
  children,
}: {
  cardRef: RefObject<HTMLDivElement | null>
  card: Card
  isTop: boolean
  onDragEnd: (event: unknown, info: PanInfo) => void
  children: ReactNode
}) {
  return (
    <div
      ref={cardRef}
      className={`ext-layer ext-layer--${card}${isTop ? ' ext-layer--top' : ''}`}
      aria-hidden={card === 'capture'}
    >
      <motion.div
        className={isTop ? 'ext-card-grab' : undefined}
        drag={isTop}
        dragSnapToOrigin
        dragMomentum={false}
        onDragEnd={onDragEnd}
      >
        {children}
      </motion.div>
    </div>
  )
}
