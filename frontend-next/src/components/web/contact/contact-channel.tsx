import { ArrowUpRight } from 'lucide-react'

// One hairline-separated contact row: mono label → one-line description →
// mailto action (email set in Geist Mono, accent). Styled by styles/web/pages/contact.css.
export function ContactChannel({
  label,
  description,
  email,
  href,
}: {
  label: string
  description: string
  email: string
  href: string
}) {
  return (
    <div className="contact-channel">
      <span className="contact-channel-label">{label}</span>
      <div className="contact-channel-body">
        <p className="contact-channel-desc">{description}</p>
        <a className="contact-channel-link" href={href}>
          <span className="contact-channel-email">{email}</span>
          <ArrowUpRight className="contact-channel-arrow" aria-hidden="true" />
        </a>
      </div>
    </div>
  )
}
