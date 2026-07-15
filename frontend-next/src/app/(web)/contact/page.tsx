import type { Metadata } from 'next'
import Link from 'next/link'

import { SubpageHeader } from '@/components/web/subpage-header'
import { ContactChannel } from '@/components/web/contact/contact-channel'
import '@/styles/web/pages/contact.css'

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with JobVault. Email us about anything — general questions, bugs, or your data — and a real person reads it.',
}

// Server component, zero client JS. Frontend-only: no form, no backend endpoint —
// just mailto links. Three hairline-separated channels + a quiet closing note.
const CHANNELS = [
  {
    label: 'General',
    description: 'Questions, feedback, or anything else on your mind.',
    email: 'support@jobvault.app',
    href: 'mailto:support@jobvault.app',
  },
  {
    label: 'Bugs',
    description: 'Something broke — tell us what you did and what you expected.',
    email: 'support@jobvault.app',
    href: 'mailto:support@jobvault.app?subject=Bug%20report',
  },
  {
    label: 'Privacy & data',
    description: 'Questions about your data, exports, or your account.',
    email: 'support@jobvault.app',
    href: 'mailto:support@jobvault.app?subject=Privacy',
  },
]

export default function ContactPage() {
  return (
    <main className="subpage">
      <div className="wrap">
        <SubpageHeader
          eyebrow="Contact"
          title={
            <>
              A real inbox, <em>not a ticket queue.</em>
            </>
          }
          lede="Email us and a human reads it — no bots, no forms, no runaround."
        />

        <div className="contact-channels">
          {CHANNELS.map((c) => (
            <ContactChannel key={c.label} {...c} />
          ))}
        </div>

        <p className="contact-note">
          Answers usually land within a couple of days. Before you write, the{' '}
          <Link href="/faq">FAQ</Link> may already have what you need.
        </p>
      </div>
    </main>
  )
}
