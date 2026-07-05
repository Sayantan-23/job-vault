'use client'

import { useReveal } from '@/components/web/landing/use-reveal'

// FAQ: four straight answers on the honest edges of the product (free tier, the
// AI's data source, the extension's reach, exports). Native <details>/<summary>
// so it works with no JS and needs no Radix on the public surface; the only
// client bit is the shared `.reveal` fade on the head + list. landing.css
// strips the default disclosure triangle and drives the custom plus marker,
// which rotates to an x and lights accent on open.
const FAQS: Array<{ q: string; a: string }> = [
  {
    q: 'Is JobVault free?',
    a: 'Yes. Tracking, personas, and the browser extension are free. AI generation runs on an hourly rate limit, and no card is ever required.',
  },
  {
    q: 'Where does the AI get my data?',
    a: 'From the profile and personas you write or import. Gemini drafts from that plus the job posting, and you review and edit every line before it goes out.',
  },
  {
    q: 'Does the extension work outside LinkedIn?',
    a: 'Yes, on any site. LinkedIn, Indeed, Naukri, Greenhouse, or any other posting page gets extracted on demand, with no per-board setup.',
  },
  {
    q: 'Can I export my documents?',
    a: 'Résumés export to PDF, copy as LaTeX, or open straight in Overleaf. Cover letters export to PDF.',
  },
]

export function FaqSection() {
  const head = useReveal<HTMLDivElement>()
  const list = useReveal<HTMLDivElement>()

  return (
    <section id="faq">
      <div className="wrap">
        <div className="sec-head reveal" ref={head.ref}>
          <h2>
            Questions, <em>answered straight</em>.
          </h2>
        </div>
        <div className="faq reveal" ref={list.ref}>
          {FAQS.map((f) => (
            <details key={f.q} className="faq-item">
              <summary>
                <span className="faq-mark" aria-hidden="true" />
                <span className="faq-q">{f.q}</span>
              </summary>
              <p className="faq-a">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
