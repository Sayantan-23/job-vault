import { Settings } from 'lucide-react'

// Compact miniature of the real Chrome-extension capture popup: indigo brand
// mark + serif wordmark + gear in a hairline TopBar, a "Captured from" source
// pill, three labeled read-only fields, and the indigo Save action. No browser
// chrome / traffic lights — the popup is not a desktop window. The Save control
// is a styled div (not a button): the whole collage is decorative and marked
// aria-hidden by the hero, so nothing here should be focusable.
export function MiniExtensionPopup() {
  return (
    <div className="mini-popup">
      <div className="mini-popup-bar">
        <span className="mini-popup-mark">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6.5 3.5h11A1.5 1.5 0 0 1 19 5v15.4a.7.7 0 0 1-1.08.59L12 17.3l-5.92 3.69A.7.7 0 0 1 5 20.4V5a1.5 1.5 0 0 1 1.5-1.5Z"
              fill="currentColor"
            />
          </svg>
        </span>
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
          <span className="mini-popup-v">San Francisco, CA</span>
        </div>

        <div className="mini-popup-btn">Save to JobVault</div>
      </div>
    </div>
  )
}
