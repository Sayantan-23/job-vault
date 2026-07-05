'use client'

import type { CSSProperties } from 'react'
import { useReveal } from '@/components/web/landing/use-reveal'

// `CSSProperties` doesn't type CSS custom properties (the `--i` stagger index
// landing.css reads). Cast through a parameter (not an inline object-literal
// assertion) so it satisfies @typescript-eslint/consistent-type-assertions.
function cssVars<T extends Record<string, string | number>>(vars: T): CSSProperties {
  return vars as CSSProperties
}

// How-it-works strip: the hero's baseboard, not a headed section. Three verb
// terminals (Capture -> Generate -> Track) as a plain three-column band that
// rides the global `.reveal` fade. landing.css owns the layout, the `--i`
// stagger, and the <=720px stacked fallback.
const STEPS: Array<{ term: string; line: string }> = [
  { term: 'Capture', line: 'One click saves the posting, from any board.' },
  { term: 'Generate', line: 'A résumé and letter, tailored to each job and persona.' },
  { term: 'Track', line: 'One pipeline that flags a job before it goes cold.' },
]

export function StepsStrip() {
  const steps = useReveal<HTMLDivElement>()

  return (
    <section className="steps-strip" aria-label="How it works">
      <div className="wrap">
        <div className="steps reveal" ref={steps.ref}>
          {STEPS.map((s, i) => (
            <div key={s.term} className="step" style={cssVars({ '--i': i })}>
              <div className="step-body">
                <div className="step-term">{s.term}</div>
                <div className="step-line">{s.line}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
