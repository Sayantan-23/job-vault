import type { ReactNode } from 'react'

// Shared editorial header for every public sub-page: eyebrow → serif h1 (with
// optional <em> accent phrase) → optional lede → optional mono meta line.
// Styled by styles/web/subpages.css.
export function SubpageHeader({
  eyebrow,
  title,
  lede,
  meta,
}: {
  eyebrow: string
  title: ReactNode
  lede?: string
  meta?: string
}) {
  return (
    <div className="subpage-head">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      {lede ? <p className="subpage-lede">{lede}</p> : null}
      {meta ? <p className="subpage-meta">{meta}</p> : null}
    </div>
  )
}
