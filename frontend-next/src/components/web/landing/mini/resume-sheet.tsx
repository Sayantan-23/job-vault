// Faithful miniature of a generated ATS résumé: white paper, centered bold
// name + contact line joined by a pipe, section titles with an accent bottom
// rule, a bold company/date row, and grey text bars standing in for bullets.
//
// `size="compact"` (hero collage, default) is the tiny surface. `size="full"`
// (documents section) reads as a real single-column ATS résumé: a Professional
// Summary, an Experience block with a role line and • bullets, a one-line Skills
// row, plus the section's two bits of tailoring theater — a one-beat AI "refine"
// swap (a bullet's weak line struck out and replaced) and the vermilion TAILORED
// rubber stamp. Both are pure CSS, gated on a `[data-shown]` ancestor (the
// documents stage), so they play once on reveal and rest on the final state
// under reduced-motion / no-JS. Presentational + server safe.
interface MiniResumeSheetProps {
  size?: 'compact' | 'full'
}

// Static ids: exactly one full résumé renders per page, so unique-per-instance
// ids (useId) buy nothing. ponytail: static ids; switch to useId if a second
// full résumé ever shares the page.
const STAMP_DISTRESS_ID = 'doc-stamp-distress'
const STAMP_MASK_ID = 'doc-stamp-mask'

// The stamp artwork, rendered twice: once as a blurred low-alpha ink-bleed
// underlay, once as the masked/distressed ink on top.
const STAMP_ART = (
  <>
    <rect x="3" y="3" width="126" height="46" rx="7" fill="none" stroke="var(--vermilion)" strokeWidth="2.5" />
    <rect x="7.5" y="7.5" width="117" height="37" rx="4" fill="none" stroke="var(--vermilion)" strokeWidth="1" />
    <text x="66" y="32" textAnchor="middle" fontSize="17" fontWeight="600" letterSpacing="3.5" fill="var(--vermilion)">
      TAILORED
    </text>
  </>
)

function TailoredStamp() {
  return (
    <svg className="stamp" viewBox="0 0 132 52" aria-hidden="true">
      <defs>
        {/* Distressed ink: fractal-noise displacement erodes the crisp vector
            edges so strokes look pressed and broken, not printed. */}
        <filter id={STAMP_DISTRESS_ID} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        {/* Uneven ink pressure: top-right prints solid, the far corner fades. */}
        <radialGradient id={`${STAMP_MASK_ID}-grad`} cx="74%" cy="24%" r="92%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.94" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.6" />
        </radialGradient>
        <mask id={STAMP_MASK_ID}>
          <rect width="132" height="52" fill={`url(#${STAMP_MASK_ID}-grad)`} />
        </mask>
      </defs>
      {/* Ink bleed: a blurred, faint duplicate haloing the impression. */}
      <g className="stamp-bleed">{STAMP_ART}</g>
      <g filter={`url(#${STAMP_DISTRESS_ID})`} mask={`url(#${STAMP_MASK_ID})`}>
        {STAMP_ART}
      </g>
    </svg>
  )
}

export function MiniResumeSheet({ size = 'compact' }: MiniResumeSheetProps = {}) {
  const full = size === 'full'
  return (
    <div className={full ? 'mini-resume mini-resume--full' : 'mini-resume'}>
      <div className="mini-resume-name">Maya Okafor</div>
      <div className="mini-resume-contact">
        {full ? 'maya.okafor@mail.com | San Francisco, CA | /in/mayaokafor' : 'maya.okafor@mail.com | San Francisco, CA'}
      </div>

      {full && (
        <>
          <div className="mini-resume-sec">Professional Summary</div>
          <div className="mini-bar mini-w95" />
          <div className="mini-bar mini-w88" />
        </>
      )}

      <div className="mini-resume-sec">Experience</div>
      <div className="mini-resume-row">
        <span className="mini-resume-co">Ramp</span>
        <span className="mini-resume-date">2021 to Now</span>
      </div>

      {full ? (
        <>
          <div className="mini-resume-role">Senior Product Manager</div>
          <div className="mini-resume-bullet">
            <span className="mini-resume-dot" aria-hidden="true">
              •
            </span>
            <div className="mini-bar mini-w95" />
          </div>
          {/* The refine beat: this bullet's weak line is struck and swapped for
              the sharper one on reveal (CSS, gated on [data-shown]). */}
          <div className="mini-resume-bullet mini-refine">
            <span className="mini-resume-dot" aria-hidden="true">
              •
            </span>
            <span className="mini-refine-swap">
              <span className="mini-refine-old">Worked on the billing system and helped the team.</span>
              <span className="mini-refine-new">Cut invoice errors 31% by rebuilding the billing engine.</span>
            </span>
          </div>
          <div className="mini-resume-bullet">
            <span className="mini-resume-dot" aria-hidden="true">
              •
            </span>
            <div className="mini-bar mini-w80" />
          </div>

          <div className="mini-resume-sec">Skills</div>
          <div className="mini-resume-skills">
            <span className="mini-resume-skilllabel">Product:</span>
            <div className="mini-bar mini-w80" />
          </div>

          <TailoredStamp />
        </>
      ) : (
        <>
          <div className="mini-bar mini-w95" />
          <div className="mini-bar mini-w80" />
          <div className="mini-bar mini-w88" />

          <div className="mini-resume-sec">Skills</div>
          <div className="mini-bar mini-w70" />
          <div className="mini-bar mini-w60" />
        </>
      )}
    </div>
  )
}
