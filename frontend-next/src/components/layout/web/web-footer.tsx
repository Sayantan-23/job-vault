import Link from 'next/link'
import { BrandChip } from '@/components/layout/web/brand-chip'
import { FooterWordmark } from '@/components/layout/web/footer-wordmark'

// Dark footer ending every public page: a giant ghost "JOBVAULT" wordmark band
// sits on top (separating it from the closing CTA on the landing page), then the
// brand + link columns on the ink surface. Self-contained (owns its dark bg), so
// it reads right whether it follows the landing's closing CTA (flush, same ink
// token = one block) or stands alone under a sub-page's warm content.
export function WebFooter() {
  return (
    <footer className="site-footer">
      <FooterWordmark />
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

          <nav className="footer-col" aria-label="Legal">
            <h4>Legal</h4>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
            <Link href="/cookies">Cookie Policy</Link>
          </nav>
        </div>

        <div className="footer-colophon">
          <span>© 2026 JobVault</span>
        </div>
      </div>
    </footer>
  )
}
