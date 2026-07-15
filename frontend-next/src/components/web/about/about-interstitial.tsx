'use client'

import { useReveal } from '@/components/web/landing/use-reveal'

// The one showpiece between the letter and the principles: a full-width serif
// statement lifted out of the flow, in the landing interstitial's register at a
// calmer scale. Static — a single reveal fade, no scroll-scrubbed letter flip.
// Styled by styles/web/pages/about.css.
export function AboutInterstitial() {
  const { ref } = useReveal<HTMLParagraphElement>({ threshold: 0.4 })

  return (
    <section className="about-interstitial" aria-label="You find out an application died by forgetting it existed.">
      <div className="wrap">
        <p className="about-interstitial-line reveal" ref={ref}>
          You find out an application died by <em>forgetting it existed.</em>
        </p>
      </div>
    </section>
  )
}
