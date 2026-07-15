import type { Metadata } from 'next'
import Link from 'next/link'

import { MakerLetter } from '@/components/web/about/maker-letter'
import { Principles } from '@/components/web/about/principles'

// Server component, zero client JS. A centered narrative column: a maker's letter
// first, numbered principles second. This page skips SubpageHeader (which is
// left-aligned) and owns its own centered header. Page-specific styles imported
// here; the shared .subpage frame comes from subpages.css via the layout.
import '@/styles/web/pages/about.css'

export const metadata: Metadata = {
  title: 'About',
  description:
    'A note from the maker: why JobVault exists. Most applications end in silence — no rejection, no reply. One place to run the whole search, and a ghost-proofing meter so nothing goes quiet unnoticed.',
}

export default function AboutPage() {
  return (
    <main className="subpage">
      <div className="wrap">
        <div className="about-col">
          <header className="about-head">
            <span className="eyebrow about-eyebrow">A note from the maker</span>
            <h1>
              Built by one person who got tired of <em>the silence.</em>
            </h1>
          </header>

          <MakerLetter />

          <Principles />

          <section className="about-closer">
            <p className="about-closer-line">
              A mobile app for iOS and Android is on the way.
            </p>
            <div className="about-cta">
              <Link className="btn btn-primary" href="/register">
                Start free
              </Link>
              <Link className="about-cta-link" href="/faq">
                Read the FAQ
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
