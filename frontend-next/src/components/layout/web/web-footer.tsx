import Link from 'next/link'
import { BrandChip } from '@/components/layout/web/brand-chip'

// Light-warm footer with a giant ghost wordmark texture behind the columns.
// Server component; page links mirror the nav (routes are public sub-pages).
export function WebFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-ghost" aria-hidden="true">
        JOBVAULT
      </div>
      <div className="wrap footer-inner">
        <div className="footer-cols">
          <div className="footer-brand">
            <BrandChip />
            <p className="footer-strap">The job search that never goes cold.</p>
            <p className="footer-note">iOS and Android app in development.</p>
          </div>

          <nav className="footer-col" aria-label="Product">
            <h4>Product</h4>
            <Link href="/register">Start free</Link>
            <Link href="/login">Login</Link>
          </nav>

          <nav className="footer-col" aria-label="Pages">
            <h4>Pages</h4>
            <Link href="/about">About</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/contact">Contact</Link>
          </nav>
        </div>

        <div className="footer-colophon">
          <span>© 2026 JobVault</span>
        </div>
      </div>
    </footer>
  )
}
