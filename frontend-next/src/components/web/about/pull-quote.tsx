import type { ReactNode } from 'react'

// The single showpiece device on /about: one large serif line pulled out of the
// letter's flow with generous vertical space, centered. Quiet — whitespace does
// the framing, no rules. Styled by styles/web/pages/about.css.
export function PullQuote({ children }: { children: ReactNode }) {
  return <blockquote className="pull-quote">{children}</blockquote>
}
