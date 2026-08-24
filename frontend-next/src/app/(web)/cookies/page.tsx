import type { Metadata } from 'next'
import Link from 'next/link'

import { SubpageHeader } from '@/components/web/subpage-header'
import { LegalDoc, LegalSection } from '@/components/web/legal/legal-doc'
import '@/styles/web/pages/legal.css'

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description:
    'JobVault sets three cookies: two to keep you signed in and one to remember your sidebar. Nothing else.',
}

export default function CookiesPage() {
  return (
    <main className="subpage">
      <div className="wrap">
        <SubpageHeader
          eyebrow="Legal"
          title="Cookie Policy"
          lede="We use cookies to keep you signed in and to remember one interface preference. That’s the whole list."
          meta="Last updated · July 15, 2026"
        />

        <LegalDoc>
          <LegalSection n="01" title="What we use">
            <ul className="legal-list">
              <li>
                <code>accessToken</code> — keeps you signed in. HTTP-only, lasts about 15 minutes.
              </li>
              <li>
                <code>refreshToken</code> — renews your session silently so you don’t get logged
                out mid-task. HTTP-only, lasts about 7 days.
              </li>
              <li>
                <code>sidebar</code> — a UI-preference cookie that remembers whether the app sidebar
                is collapsed. Not HTTP-only; lasts about a year.
              </li>
            </ul>
          </LegalSection>

          <LegalSection n="02" title="What we don’t use">
            <p>
              No analytics, advertising, or third-party cookies of any kind. See the{' '}
              <Link href="/privacy">privacy policy</Link> for the fuller picture on data.
            </p>
          </LegalSection>

          <LegalSection n="03" title="Managing cookies">
            <p>
              You can clear cookies in your browser at any time, and signing out clears the session
              pair.
            </p>
            <p>
              Blocking the essential pair (<code>accessToken</code> and <code>refreshToken</code>)
              means you won’t be able to stay signed in.
            </p>
          </LegalSection>
        </LegalDoc>
      </div>
    </main>
  )
}
