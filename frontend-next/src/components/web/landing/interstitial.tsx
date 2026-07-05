'use client'

import type { CSSProperties } from 'react'

import { useReveal } from '@/components/web/landing/use-reveal'

// `CSSProperties` doesn't type CSS custom properties (the `--i` stagger index
// landing.css reads). Cast through a parameter (not an inline object-literal
// assertion) so it satisfies @typescript-eslint/consistent-type-assertions.
function cssVars<T extends Record<string, string | number>>(vars: T): CSSProperties {
  return vars as CSSProperties
}

// Kinetic serif interstitial: one full-width display line that punctuates the
// scroll between the dark Track band and the FAQ. Each word is a `.reveal`
// child under the observed wrapper, so it rides the uniform fade-rise staggered
// by its `--i` index — word-level, no letter-splitting. "accounted for." is the
// italic accent phrase. Reduced-motion / no-JS resolve to the visible final
// state via the shared `.reveal` fallback blocks. No eyebrow, no other content.
const WORDS: Array<{ w: string; accent?: boolean }> = [
  { w: 'Every' },
  { w: 'application,' },
  { w: 'accounted', accent: true },
  { w: 'for.', accent: true },
]

export function Interstitial() {
  const { ref } = useReveal<HTMLParagraphElement>({ threshold: 0.4 })

  return (
    <section className="interstitial" aria-label="Every application, accounted for.">
      <div className="wrap">
        <p className="interstitial-line" ref={ref}>
          {WORDS.map((word, i) => (
            <span key={word.w} className="reveal iword" style={cssVars({ '--i': i })}>
              {word.accent ? <em>{word.w}</em> : word.w}{' '}
            </span>
          ))}
        </p>
      </div>
    </section>
  )
}
