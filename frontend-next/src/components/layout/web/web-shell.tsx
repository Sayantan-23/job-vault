import type { ReactNode } from 'react'
import { WebNav } from '@/components/layout/web/web-nav'
import { WebFooter } from '@/components/layout/web/web-footer'
import { ClosingSection } from '@/components/web/landing/closing-section'

// Public-surface chrome for "The Circuit of One Search" landing. The two fixed
// backdrop layers (warm baseline rhythm + faint noise) sit behind `.shell`,
// which carries the nav, the page sections, and the dark finale (closing CTA +
// footer share one ink surface) that now ends EVERY public page, not just the
// landing. All styling comes from styles/web/landing.css (no Tailwind utilities
// on the bespoke visuals).
export function WebShell({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="bg-baseline" aria-hidden="true" />
      <div className="bg-noise" aria-hidden="true" />
      <div className="shell">
        <WebNav />
        {children}
        <ClosingSection />
        <WebFooter />
      </div>
    </>
  )
}
