import type { Metadata } from 'next'

import { AboutHeader } from '@/components/web/about/about-header'
import { AboutInterstitial } from '@/components/web/about/about-interstitial'
import { LetterMeta } from '@/components/web/about/letter-meta'
import { MakerLetter } from '@/components/web/about/maker-letter'
import { Principles } from '@/components/web/about/principles'

// The letter, re-set at the standard page width with the landing's visual
// grammar: a two-column header (statement + a typeset letter artifact), the
// letter itself against a mono memo-rail, an interstitial pull-quote, and a 2×2
// principles grid. No self-owned closer — the (web) shell renders the global
// dark ClosingSection + footer after every page. Page-specific styles here; the
// shared .subpage frame comes from subpages.css via the layout.
import '@/styles/web/pages/about.css'

export const metadata: Metadata = {
  title: 'About',
  description:
    'A note from the maker: why JobVault exists. Most applications end in silence — no rejection, no reply. One place to run the whole search, and a ghost-proofing meter so nothing goes quiet unnoticed.',
}

export default function AboutPage() {
  return (
    <main className="subpage">
      <AboutHeader />

      <div className="about-letter">
        <div className="wrap">
          <LetterMeta />
          <MakerLetter />
        </div>
      </div>

      <AboutInterstitial />

      <Principles />
    </main>
  )
}
