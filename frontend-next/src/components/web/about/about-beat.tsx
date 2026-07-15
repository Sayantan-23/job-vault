import type { ReactNode } from 'react'

// One editorial beat on /about: a mono eyebrow label → serif h2 (with optional
// <em> accent) → the beat's content. Styled by styles/web/pages/about.css.
export function AboutBeat({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: ReactNode
  children: ReactNode
}) {
  return (
    <section className="about-beat">
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {children}
    </section>
  )
}
