import type { Metadata } from 'next'
import Link from 'next/link'

import { SubpageHeader } from '@/components/web/subpage-header'
import { LegalDoc, LegalSection } from '@/components/web/legal/legal-doc'
import '@/styles/web/pages/legal.css'

export const metadata: Metadata = {
  title: 'Privacy',
  description:
    'What JobVault collects, what it deliberately does not, and how your data is stored, processed, and controlled — in plain language.',
}

export default function PrivacyPage() {
  return (
    <main className="subpage">
      <div className="wrap">
        <SubpageHeader
          eyebrow="Legal"
          title={
            <>
              Your data, <em>on the record.</em>
            </>
          }
          lede="What we collect, what we don’t, and how it’s handled — written to be read, not skimmed past."
          meta="Last updated · July 15, 2026"
        />

        <LegalDoc>
          <LegalSection n="01" title="What we collect">
            <p>
              Your account: an email address and a password, stored only as a bcrypt hash — we never
              keep the password itself.
            </p>
            <p>
              The content you create: job postings you save (including text captured from posting
              pages you choose to save), application statuses, timeline events, reminders, your
              profile, personas, and the résumés and cover letters you generate.
            </p>
            <p>
              API keys you mint for the browser extension are stored only as a hash and shown to you
              exactly once. We also keep basic AI-usage counts — timestamps of your generation and
              refine requests — used solely to enforce the hourly rate limit.
            </p>
          </LegalSection>

          <LegalSection n="02" title="What we don’t collect">
            <p>
              No analytics or tracking scripts, no advertising identifiers, no third-party cookies,
              and no payment data — there are no payments.
            </p>
            <p>
              Résumé PDFs are rendered in your browser; we run no server-side file storage. If you
              import a résumé PDF to build a persona, it is parsed in memory — the file itself is
              never kept.
            </p>
          </LegalSection>

          <LegalSection n="03" title="AI processing">
            <p>
              When you generate or refine a document, the relevant persona and profile content along
              with the job posting are sent to Google’s Gemini API for processing. That transfer is
              governed by Google’s terms.
            </p>
            <p>
              We send nothing to any AI provider except when you explicitly click generate or refine.
            </p>
          </LegalSection>

          <LegalSection n="04" title="Cookies">
            <p>
              Essential cookies only — the pair that keeps you signed in. No tracking, no analytics.
              See the <Link href="/cookies">cookie policy</Link> for the full list.
            </p>
          </LegalSection>

          <LegalSection n="05" title="Where your data lives & security">
            <p>
              Your data is stored in our PostgreSQL database. Passwords and API keys are hashed with
              bcrypt, and sessions run on short-lived HTTP-only cookies.
            </p>
          </LegalSection>

          <LegalSection n="06" title="Your control">
            <p>
              You can edit or delete jobs, personas, documents, reminders, and API keys at any time
              from the app. Deleting an entity removes it from our database.
            </p>
            <p>
              For anything else, including account deletion, <Link href="/contact">contact us</Link>.
            </p>
          </LegalSection>

          <LegalSection n="07" title="Changes">
            <p>
              If this policy changes, we’ll update this page and the date at the top so you can see
              what changed and when.
            </p>
          </LegalSection>
        </LegalDoc>
      </div>
    </main>
  )
}
