import Link from 'next/link'

// Sticky hairline nav, mono-flavored. Server component (no client JS) — links
// are plain next/link anchors, CTAs are the custom `.btn` system (no shadcn
// primitives on the public surface).
export function WebNav() {
  return (
    <nav className="bar">
      <div className="wrap">
        <Link className="brand" href="/">
          {/* Seed trace: a stub of the page circuit entering from the left edge
              and soldering under the brand mark (the wire the whole page runs
              on). Hidden on the mobile nav. */}
          <svg className="nav-seed" viewBox="0 0 90 10" fill="none" aria-hidden="true">
            <path className="trace-faint" d="M0 5 H84" />
            <circle className="junction" cx="86" cy="5" r="3" />
          </svg>
          <span className="mark">J</span> JobVault
        </Link>
        <div className="navlinks">
          <Link href="/#how">How it connects</Link>
          <Link href="/#documents">Documents</Link>
          <Link href="/#extension">Extension</Link>
        </div>
        <div className="navright">
          <Link className="login" href="/login">
            Log in
          </Link>
          <Link className="btn btn-primary" href="/register">
            Start free
          </Link>
        </div>
      </div>
    </nav>
  )
}
