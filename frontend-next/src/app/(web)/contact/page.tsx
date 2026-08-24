import type { Metadata } from 'next'

import { EmailHero, SecondaryLinks } from '@/components/web/contact/contact-hero'
import '@/styles/web/pages/contact.css'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Email JobVault about anything: general questions, bugs, or your data. No contact form, no ticket queue.',
}

// Server component, zero client JS. The whole page is one oversized mailto:
// a centered vertical stack made intentional by scale, not by rows.
const EMAIL = 'support@jobvault.app'

export default function ContactPage() {
  return (
    <main className="subpage contact-page">
      <div className="wrap">
        <div className="contact-stack">
          <span className="eyebrow contact-kicker">Contact</span>

          <h1 className="contact-statement">
            Say it to a person, <em>not a form.</em>
          </h1>

          <EmailHero email={EMAIL} />

          <p className="contact-micro">usually replies within a couple of days</p>

          <SecondaryLinks email={EMAIL} />
        </div>
      </div>
    </main>
  )
}
