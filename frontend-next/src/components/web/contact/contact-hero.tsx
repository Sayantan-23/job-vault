import Link from 'next/link'

// The oversized mailto — this link IS the design. Set in Geist Mono at a
// viewport-scaled size (see .contact-email in styles/web/pages/contact.css).
export function EmailHero({ email }: { email: string }) {
  return (
    <a className="contact-email" href={`mailto:${email}`}>
      {email}
    </a>
  )
}

// Quiet hairline-separated row: two subject-prefilled mailtos + the FAQ.
export function SecondaryLinks({ email }: { email: string }) {
  return (
    <nav className="contact-secondary" aria-label="Other ways to reach us">
      <a href={`mailto:${email}?subject=Bug%20report`}>Report a bug</a>
      <span className="contact-dot" aria-hidden="true">
        ·
      </span>
      <a href={`mailto:${email}?subject=Privacy`}>Privacy question</a>
      <span className="contact-dot" aria-hidden="true">
        ·
      </span>
      <Link href="/faq">Read the FAQ</Link>
    </nav>
  )
}
