import Link from 'next/link'

// Record-style colophon over hairlines (Product / Company / Legal). A faint
// trace exits the bottom edge of the page elsewhere to close the wire metaphor.
// Server component; links route to the landing anchors and the public sub-pages.
export function WebFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="col">
          <Link className="brand" href="/">
            <span className="mark">J</span> JobVault
          </Link>
          <p className="blurb">
            One connected home for your job search. From the first saved posting to the offer,
            nothing goes cold.
          </p>
        </div>
        <div className="col">
          <h4>Product</h4>
          <Link href="/#pipeline">Pipeline</Link>
          <Link href="/#documents">Documents</Link>
          <Link href="/#features">Personas</Link>
          <Link href="/#extension">Extension</Link>
        </div>
        <div className="col">
          <h4>Company</h4>
          <Link href="/about">About</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/faq">FAQ</Link>
        </div>
        <div className="col">
          <h4>Legal</h4>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
        <div className="copy">© 2026 JobVault. Built for people in the middle of a job search.</div>
      </div>
    </footer>
  )
}
