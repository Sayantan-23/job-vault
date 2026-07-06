'use client'

import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'

// The giant ghost "JOBVAULT" wordmark that separates the closing CTA from the
// footer columns. Scroll-linked horizontal drift (~40px) via useScroll/useTransform
// on this client leaf; transform-only so no-JS/`scripting:none` renders it fully
// (never gated on opacity). `useReducedMotion` resolves it static.
export function FooterWordmark() {
  const ref = useRef<HTMLDivElement | null>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })
  const x = useTransform(scrollYProgress, [0, 1], [-20, 20])

  return (
    <div className="footer-wordmark" ref={ref} aria-hidden="true">
      <motion.span className="footer-wordmark-text" style={reduce ? {} : { x }}>
        JOBVAULT
      </motion.span>
    </div>
  )
}
