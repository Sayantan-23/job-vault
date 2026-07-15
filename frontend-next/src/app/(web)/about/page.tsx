import type { Metadata } from 'next'
import Link from 'next/link'

import { SubpageHeader } from '@/components/web/subpage-header'
import { AboutBeat } from '@/components/web/about/about-beat'
import { SystemFlow } from '@/components/web/about/system-flow'
import { PrincipleList } from '@/components/web/about/principle-list'

// Server component, zero client JS. Page-specific styles imported here (global
// CSS imports in a page file are fine in the App Router); the shared sub-page
// foundation (.subpage / SubpageHeader) comes from subpages.css via the layout.
import '@/styles/web/pages/about.css'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Why JobVault exists: a job search scatters across tabs and spreadsheets, and most applications end in silence. One connected system — capture, personas, documents, pipeline, and ghost-proofing.',
}

export default function AboutPage() {
  return (
    <main className="subpage">
      <div className="wrap">
        <SubpageHeader
          eyebrow="About"
          title={
            <>
              Built against <em>the silence.</em>
            </>
          }
          lede="Most applications end without a word back. JobVault exists so none of yours quietly slip away."
        />

        <hr className="subpage-rule" />

        <AboutBeat
          eyebrow="The problem"
          title={
            <>
              A search that <em>scatters.</em>
            </>
          }
        >
          <div className="about-prose">
            <p>
              A job search lives in twenty open tabs. Postings you meant to apply to, applications
              you already sent, a spreadsheet you update when you remember, documents renamed and
              scattered across folders. The work is spread so thin that keeping track of it becomes
              a second job.
            </p>
            <p>
              Then most of it goes quiet. You send an application into a form and hear nothing back —
              no rejection, no next step, just silence. Nothing tells you when one has gone cold. You
              find out by forgetting about it.
            </p>
            <p>That silence is the thing JobVault is built around.</p>
          </div>
        </AboutBeat>

        <AboutBeat
          eyebrow="The system"
          title={
            <>
              One <em>connected</em> system.
            </>
          }
        >
          <div className="about-prose">
            <p>
              Everything a search needs, wired together — capture through follow-up — so no part of
              it lives in a tab you forget to reopen.
            </p>
          </div>
          <SystemFlow />
        </AboutBeat>

        <AboutBeat
          eyebrow="Principles"
          title={
            <>
              Where we <em>stand.</em>
            </>
          }
        >
          <PrincipleList />
        </AboutBeat>

        <AboutBeat
          eyebrow="What's next"
          title={
            <>
              More of it, <em>in your pocket.</em>
            </>
          }
        >
          <div className="about-prose">
            <p>A mobile app for iOS and Android is in development.</p>
          </div>
          <div className="about-cta">
            <Link className="btn btn-primary" href="/register">
              Start free
            </Link>
            <Link className="about-cta-link" href="/faq">
              Questions? Read the FAQ
            </Link>
          </div>
        </AboutBeat>
      </div>
    </main>
  )
}
