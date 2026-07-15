'use client'

import { useCallback, useRef, type CSSProperties } from 'react'
import {
  motion,
  useReducedMotion,
  useScroll,
  type MotionStyle,
  type MotionValue,
} from 'motion/react'

import { useReveal } from '@/components/web/landing/use-reveal'

// `CSSProperties` doesn't type CSS custom properties (the `--i` stagger index
// landing.css reads). Cast through a parameter (not an inline object-literal
// assertion) so it satisfies @typescript-eslint/consistent-type-assertions.
function cssVars<T extends Record<string, string | number>>(vars: T): CSSProperties {
  return vars as CSSProperties
}

// `MotionStyle` doesn't type CSS custom-property keys (motion supports them at
// runtime); cast through a parameter, mirroring pipeline-section.tsx.
function motionVars(vars: Record<string, MotionValue<number>>): MotionStyle {
  return vars as MotionStyle
}

// Kinetic serif interstitial: one full-width display line that punctuates the
// scroll between the dark Track band and the FAQ. Each word is a `.reveal`
// child under the observed wrapper, so it rides the uniform fade-rise staggered
// by its `--i` index. "accounted for." is the accent phrase: it rests as faint
// non-italic accent letters, and a scroll-scrubbed sweep flips each letter to
// full-opacity italic left-to-right (a near-step swap, one glyph per frame),
// then deepens its color a beat later (`--ip` line progress + per-letter `--lt`
// threshold, mapped in landing.css — scrolling back un-flips it). Reduced
// motion / no-JS resolve to the settled italic state via the `--ip: 1` default
// and the shared `.reveal` fallback blocks. No eyebrow, no other content.
const WORDS: Array<{ w: string; accent?: boolean }> = [
  { w: 'Every' },
  { w: 'application,' },
  { w: 'accounted', accent: true },
  { w: 'for.', accent: true },
]

const ACCENT_LETTERS = WORDS.filter((w) => w.accent).reduce((n, w) => n + w.w.length, 0)

export function Interstitial() {
  const { ref: revealRef } = useReveal<HTMLParagraphElement>({ threshold: 0.4 })
  const lineRef = useRef<HTMLParagraphElement | null>(null)
  const reduce = useReducedMotion()

  // One node drives both the reveal observer and the scroll target.
  const setLine = useCallback(
    (node: HTMLParagraphElement | null) => {
      lineRef.current = node
      revealRef.current = node
    },
    [revealRef],
  )

  // 0 once the line sits mid-lower in the viewport, 1 as it rises to center —
  // so the flip only begins after the line is fully on screen.
  const { scrollYProgress } = useScroll({
    target: lineRef,
    offset: ['start 0.8', 'start 0.3'],
  })

  let letter = 0
  return (
    <section className="interstitial" aria-label="Every application, accounted for.">
      <div className="wrap">
        <motion.p
          className="interstitial-line"
          ref={setLine}
          style={reduce ? {} : motionVars({ '--ip': scrollYProgress })}
        >
          {WORDS.map((word, i) => (
            <span key={word.w} className="reveal iword" style={cssVars({ '--i': i })}>
              {word.accent ? (
                <em>
                  {/* letter-split is presentational; AT reads the sr-only word */}
                  <span aria-hidden="true">
                    {word.w.split('').map((ch, j) => {
                      // Letters flip left→right over 0..0.6 of line progress; the
                      // delayed color ramp (start +0.12, CSS) then completes the
                      // last letter by --ip: 1.
                      const t = (letter++ / (ACCENT_LETTERS - 1)) * 0.6
                      return (
                        <span
                          key={j}
                          className="ilit"
                          data-ch={ch}
                          style={cssVars({ '--lt': t.toFixed(3) })}
                        >
                          {ch}
                        </span>
                      )
                    })}
                  </span>
                  <span className="sr-only">{word.w}</span>
                </em>
              ) : (
                word.w
              )}{' '}
            </span>
          ))}
        </motion.p>
      </div>
    </section>
  )
}
