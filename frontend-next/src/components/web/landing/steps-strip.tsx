'use client'

import type { CSSProperties, ComponentType } from 'react'
import { FileText, KanbanSquare, MousePointerClick } from 'lucide-react'
import { useReveal } from '@/components/web/landing/use-reveal'

// `CSSProperties` doesn't type CSS custom properties (the `--i` stagger index
// landing.css reads). Cast through a parameter (not an inline object-literal
// assertion) so it satisfies @typescript-eslint/consistent-type-assertions.
function cssVars<T extends Record<string, string | number>>(vars: T): CSSProperties {
  return vars as CSSProperties
}

// How-it-works strip: the hero's baseboard, not a headed section. Three verb
// terminals (Capture -> Generate -> Track), each a numbered dot-chip + accent
// icon over the existing mono term and one-liner, linked by a hairline
// connector (Floria pattern). landing.css owns the layout, the connector, the
// `--i` stagger, and the <=720px stacked fallback.
type IconType = ComponentType<{ size?: number; 'aria-hidden'?: boolean }>
const STEPS: Array<{ term: string; line: string; Icon: IconType }> = [
  { term: 'Capture', line: 'One click saves the posting, from any board.', Icon: MousePointerClick },
  { term: 'Generate', line: 'A résumé and letter, tailored to each job and persona.', Icon: FileText },
  { term: 'Track', line: 'One pipeline that flags a job before it goes cold.', Icon: KanbanSquare },
]

export function StepsStrip() {
  const { ref: stepsRef } = useReveal<HTMLDivElement>()

  return (
    <section className="steps-strip" aria-label="How it works">
      <div className="wrap">
        <div className="steps" ref={stepsRef}>
          {STEPS.map((s, i) => (
            <div key={s.term} className="step reveal" style={cssVars({ '--i': i })}>
              <div className="step-chip">{String(i + 1).padStart(2, '0')}</div>
              <div className="step-main">
                <div className="step-head">
                  <span className="step-icon">
                    <s.Icon size={20} aria-hidden />
                  </span>
                  <div className="step-term">{s.term}</div>
                </div>
                <div className="step-line">{s.line}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
