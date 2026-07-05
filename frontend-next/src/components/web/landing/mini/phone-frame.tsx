// Honest teaser for the (planned, not built) mobile app: a rounded phone
// silhouette with a thin ink bezel + speaker slot (no notch), a mini jobs list
// on screen, and an overlapping "in development" tag. Presentational + server
// safe.
export function MiniPhoneFrame() {
  return (
    <div className="mini-phone">
      <div className="mini-phone-bezel">
        <span className="mini-phone-speaker" />
      </div>

      <div className="mini-phone-screen">
        <div className="mini-phone-row">
          <span className="mini-phone-title">Frontend Engineer</span>
          <span className="mini-phone-chip">Applied</span>
        </div>
        <div className="mini-phone-row">
          <span className="mini-phone-title">Data Analyst</span>
          <span className="mini-phone-chip">Saved</span>
        </div>
      </div>

      <span className="mini-phone-tag">Mobile · in development</span>
    </div>
  )
}
