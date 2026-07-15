import Link from 'next/link'

// Brand mark: a bookmark (save a job), rendered white on the indigo chip.
// Ported from the extension's LogoMark so the public site, app, and extension
// share one glyph.
function LogoMark() {
  return (
    <svg viewBox="0 0 24 24" className="brand-glyph" aria-hidden="true">
      <path
        d="M6.5 3.5h11A1.5 1.5 0 0 1 19 5v15.4a.7.7 0 0 1-1.08.59L12 17.3l-5.92 3.69A.7.7 0 0 1 5 20.4V5a1.5 1.5 0 0 1 1.5-1.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

// The brand lockup used by both the nav and the footer: indigo chip + serif
// wordmark, wrapped as one link to home.
export function BrandChip() {
  return (
    <Link className="brand" href="/">
      <span className="brand-mark">
        <LogoMark />
      </span>
      JobVault
    </Link>
  )
}
