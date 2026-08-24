import type { Metadata } from 'next'
import Link from 'next/link'

import { SubpageHeader } from '@/components/web/subpage-header'
import { LegalDoc, LegalSection } from '@/components/web/legal/legal-doc'
import '@/styles/web/pages/legal.css'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'What JobVault collects, what it does not, and how your data is stored, processed, and deleted. Written in plain language.',
}

export default function PrivacyPage() {
  return (
    <main className="subpage">
      <div className="wrap">
        <SubpageHeader
          eyebrow="Legal"
          title="Privacy Policy"
          lede="What we collect, what we don’t, and how it’s handled — written to be read."
          meta="Last updated · July 15, 2026"
        />

        <LegalDoc>
          <LegalSection
            n="01"
            title="What we collect"
            inShort="Your account, the things you save, and rate-limit counters — that’s it."
          >
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

          <LegalSection
            n="03"
            title="AI processing"
            inShort="Your content goes to Gemini only when you click generate."
          >
            <p>
              When you generate or refine a document, the relevant persona and profile content along
              with the job posting are sent to Google’s Gemini API for processing. That transfer is
              governed by Google’s terms.
            </p>
            <p>
              We send nothing to any AI provider except when you explicitly click generate or refine.
            </p>
          </LegalSection>

          <LegalSection
            n="04"
            title="Third-party services"
            inShort="One AI provider, our own database, nothing else."
          >
            <p>
              Only two kinds of service ever touch your data. Google’s Gemini API processes your
              persona and job content — and only when you click generate or refine. And the hosting
              and database infrastructure we run the app on stores it.
            </p>
            <p>
              No analytics, no ad networks, no data brokers. If this list ever changes, this page
              changes with it.
            </p>
          </LegalSection>

          <LegalSection n="05" title="Cookies">
            <p>
              Essential cookies only — the pair that keeps you signed in. No tracking, no analytics.
              See the <Link href="/cookies">cookie policy</Link> for the full list.
            </p>
          </LegalSection>

          <LegalSection
            n="06"
            title="Data retention"
            inShort="Your data stays until you delete it."
          >
            <p>
              We keep your data for as long as your account exists. Deleting a job, persona,
              document, reminder, or API key removes it from the database immediately — there’s no
              separate archive or backup product holding a copy.
            </p>
          </LegalSection>

          <LegalSection
            n="07"
            title="Your rights"
            inShort="See it, fix it, delete it, take it with you."
          >
            <p>
              You can access everything you’ve stored — it’s all visible in the app and exportable.
              You can correct any of it, since everything is editable, delete it, and take it with
              you through the PDF and LaTeX exports.
            </p>
            <p>
              For anything you can’t do yourself in the app — including full account deletion —{' '}
              <Link href="/contact">contact us</Link> and we’ll handle it.
            </p>
          </LegalSection>

          <LegalSection n="08" title="Children">
            <p>
              JobVault is a job-search tool and isn’t directed at children. We don’t knowingly
              collect data from anyone under 16.
            </p>
          </LegalSection>

          <LegalSection n="09" title="Where your data lives & security">
            <p>
              Your data is stored in our PostgreSQL database. Passwords and API keys are hashed with
              bcrypt, and sessions run on short-lived HTTP-only cookies.
            </p>
            <p>
              Your data is processed where our servers and Google’s Gemini API run, which may be
              outside your own country.
            </p>
          </LegalSection>

          <LegalSection n="10" title="Changes">
            <p>
              If this policy changes, we’ll update this page and the date at the top so you can see
              what changed and when.
            </p>
          </LegalSection>

          <LegalSection n="11" title="Contact">
            <p>
              Questions about your data, or a request we can’t handle in the app?{' '}
              <Link href="/contact">Get in touch</Link>.
            </p>
          </LegalSection>
        </LegalDoc>
      </div>
    </main>
  )
}
