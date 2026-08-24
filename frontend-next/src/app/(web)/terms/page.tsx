import type { Metadata } from 'next'
import Link from 'next/link'

import { SubpageHeader } from '@/components/web/subpage-header'
import { LegalDoc, LegalSection } from '@/components/web/legal/legal-doc'
import '@/styles/web/pages/legal.css'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'The terms for using JobVault: your account, your content, AI output, acceptable use, and the limits on our liability.',
}

export default function TermsPage() {
  return (
    <main className="subpage">
      <div className="wrap">
        <SubpageHeader
          eyebrow="Legal"
          title="Terms of Service"
          lede="What you can expect from JobVault, and what we ask in return."
          meta="Last updated · July 15, 2026"
        />

        <LegalDoc>
          <LegalSection
            n="01"
            title="The service"
            inShort="Track jobs, write personas, draft résumés and cover letters — free, rate-limited."
          >
            <p>
              JobVault helps you track job applications, write personas, draft AI-assisted résumés
              and cover letters, and capture postings with a browser extension.
            </p>
            <p>It’s provided free. AI generation is rate-limited per hour.</p>
          </LegalSection>

          <LegalSection n="02" title="Your account">
            <p>
              Use an accurate email and keep your password safe. You’re responsible for activity
              under your account and under any API keys you mint for the extension.
            </p>
            <p>You can revoke a key at any time.</p>
          </LegalSection>

          <LegalSection n="03" title="Your content">
            <p>
              Everything you save or generate is yours. We claim no ownership. We store and process
              it only to run the service for you.
            </p>
          </LegalSection>

          <LegalSection
            n="04"
            title="AI output"
            inShort="Drafts are a starting point — review before you send."
          >
            <p>
              Drafts are generated from your content and the job posting. Review them before you use
              them — you are responsible for what you send to employers, and we don’t guarantee the
              accuracy of generated text.
            </p>
          </LegalSection>

          <LegalSection
            n="05"
            title="Acceptable use"
            inShort="Don’t break it, resell it, or use it unlawfully."
          >
            <p>
              Don’t abuse the service: no attempts to break, overload, or scrape it, no reselling
              access, and nothing unlawful.
            </p>
            <p>
              Respect the job boards you capture from — the extension only extracts pages you
              deliberately choose to save.
            </p>
          </LegalSection>

          <LegalSection n="06" title="Availability & changes">
            <p>
              The service is provided as-is with no uptime guarantee, and features may change over
              time. We may suspend accounts that violate these terms.
            </p>
          </LegalSection>

          <LegalSection
            n="07"
            title="Liability"
            inShort="It’s free and as-is; we’re not liable for indirect losses."
          >
            <p>
              To the extent the law allows, we’re not liable for indirect damages — such as a lost
              job opportunity. The service is free and provided as-is.
            </p>
          </LegalSection>

          <LegalSection n="08" title="Contact">
            <p>
              Questions about these terms? <Link href="/contact">Get in touch</Link>.
            </p>
          </LegalSection>
        </LegalDoc>
      </div>
    </main>
  )
}
