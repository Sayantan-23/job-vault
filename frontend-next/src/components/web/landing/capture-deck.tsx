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
// success card drops onto it. After that the deck is interactive: the TOP card
// is draggable (a nested drag surface with `dragSnapToOrigin`), and dragging it
// past a threshold swaps it to the back while the other card springs forward.
type Card = 'capture' | 'success'

// Deck slots. `x`/`y` are translate (motion writes them as transform, matching
// the CSS resting transforms so hand-off is seamless). Front sits offset
// down-right with a settling tilt; back sits at origin, dimmed and scaled.
const FRONT = { x: 24, y: 24, rotate: -1, scale: 1, opacity: 1, zIndex: 2 }
const BACK = { x: 0, y: 0, rotate: 0, scale: 0.97, opacity: 0.75, zIndex: 1 }

// A drag counts as a swap past ~120px horizontal travel or a firm flick.
const SWAP_DISTANCE = 120
const SWAP_VELOCITY = 500

const SPRING = { type: 'spring', stiffness: 320, damping: 30 } as const

export function CaptureDeck() {
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const inView = useInView(scope, { once: true, amount: 0.4 })
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

    // Pre-entrance: capture alone (full), success hidden just below-right.
    animate(cap, { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, zIndex: 1 }, { duration: 0 })
    animate(suc, { x: 18, y: 40, rotate: -3, scale: 1, opacity: 0, zIndex: 2 }, { duration: 0 })
    // The drop: capture recedes, success settles onto the front slot.
    animate(cap, { scale: 0.97, opacity: 0.75 }, { ...SPRING, delay: 1.4 })
    animate(suc, { x: 24, y: 24, rotate: -1, opacity: 1 }, { ...SPRING, delay: 1.4 })
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
    <div ref={cardRef} className={`ext-layer ext-layer--${card}`} aria-hidden={card === 'capture'}>
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
