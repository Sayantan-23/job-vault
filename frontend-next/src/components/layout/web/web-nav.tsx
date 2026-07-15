import Link from 'next/link'
import { BrandChip } from '@/components/layout/web/brand-chip'

// Page links carried by the header (routes exist as stubs; real pages later).
const NAV_LINKS = [
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/login', label: 'Login' },
]

// Floating pill nav — detached from the top edge, centered, one line at desktop.
// Server component: the desktop links are plain anchors and the mobile disclosure
// is a native <details>, so there is zero client JS on the public surface.
export function WebNav() {
  return (
    <nav className="nav" aria-label="Main">
      <div className="wrap">
        <div className="nav-pill">
          <BrandChip />

          <div className="nav-links">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>

          <div className="nav-right">
            <Link className="btn btn-primary nav-cta" href="/register">
              Start free
            </Link>
            <details className="nav-menu">
              <summary className="nav-menu-toggle" aria-label="Menu">
                <span className="nav-menu-bars" aria-hidden="true" />
              </summary>
              <div className="nav-menu-panel">
                {NAV_LINKS.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label}
                  </Link>
                ))}
              </div>
            </details>
          </div>
        </div>
      </div>
    </nav>
  )
}
