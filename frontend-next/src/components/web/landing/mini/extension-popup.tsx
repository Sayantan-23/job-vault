import { Check, Settings } from 'lucide-react'

// The shared indigo brand mark (white bookmark glyph in a rounded indigo
// square). Same mark for the compact hero collage and the full-size capture
// popup, so the wordmark chrome never drifts between surfaces.
const BRAND_MARK = (
  <span className="mini-popup-mark">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6.5 3.5h11A1.5 1.5 0 0 1 19 5v15.4a.7.7 0 0 1-1.08.59L12 17.3l-5.92 3.69A.7.7 0 0 1 5 20.4V5a1.5 1.5 0 0 1 1.5-1.5Z"
        fill="currentColor"
      />
    </svg>
  </span>
)

type PopupSize = 'compact' | 'full'
type PopupState = 'capture' | 'success'

interface MiniExtensionPopupProps {
  /** `compact` = hero collage (232px); `full` = capture section (360px, spec). */
  size?: PopupSize
  /** `capture` = the extract form; `success` = the post-save confirmation. */
  state?: PopupState
}

// Faithful miniature of the real Chrome-extension capture popup. No browser
// chrome / traffic lights — the popup is not a desktop window. Controls are
// styled divs (not buttons): every surface it appears in marks the whole visual
// decorative, so nothing here should be focusable.
export function MiniExtensionPopup({
  size = 'compact',
  state = 'capture',
}: MiniExtensionPopupProps = {}) {
  const rootClass = size === 'full' ? 'mini-popup mini-popup--full' : 'mini-popup'

  if (state === 'success') {
    // Success view (no TopBar): green check, serif confirmation, the saved
    // job's title/company, then the two stacked actions.
    return (
      <div className={rootClass}>
        <div className="mini-popup-success">
          <span className="mini-popup-check">
            <Check aria-hidden="true" />
          </span>
          <div className="mini-popup-done">Saved to JobVault</div>
          <div className="mini-popup-sub">
            <span className="mini-popup-sub-title">Senior Product Manager</span>
            <span className="mini-popup-sub-co"> · Ramp</span>
          </div>
          <div className="mini-popup-actions">
            <div className="mini-popup-btn">Open in JobVault ↗</div>
            <div className="mini-popup-btn mini-popup-btn--ghost">Done</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={rootClass}>
      <div className="mini-popup-bar">
        {BRAND_MARK}
        <span className="mini-popup-brand">JobVault</span>
        <Settings className="mini-popup-gear" aria-hidden="true" />
      </div>

      <div className="mini-popup-body">
        <div className="mini-popup-src">
          <span className="mini-popup-srclabel">Captured from</span>
          <span className="mini-popup-pill">LinkedIn</span>
        </div>

        <div className="mini-popup-field">
          <span className="mini-popup-k">Title</span>
          <span className="mini-popup-v">Senior Product Manager</span>
        </div>
        <div className="mini-popup-field">
          <span className="mini-popup-k">Company</span>
          <span className="mini-popup-v">Ramp</span>
        </div>
        <div className="mini-popup-field">
          <span className="mini-popup-k">Location</span>
          <span className="mini-popup-v">San Francisco, CA · Hybrid</span>
        </div>

        <div className="mini-popup-btn">Save to JobVault</div>
      </div>
    </div>
  )
}
