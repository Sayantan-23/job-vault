import { Battery, Bell, Clock, FileText, LayoutDashboard, Timer, User, Wifi } from 'lucide-react'

// Honest teaser for the (planned, not built) mobile app: a modern phone shell
// with a thin dark bezel, a pill dynamic island, a status bar, and a mini
// JobVault jobs screen (header, mono section label, jobs list, bottom tab bar)
// on the warm canvas. Presentational + server safe. The "in development" tag
// hangs below the shell so it stays honest about the status.
const JOBS = [
  { title: 'Frontend Engineer', meta: 'Linear · Remote', days: '2d', tone: 'fresh' as const },
  { title: 'Product Designer', meta: 'Ramp · New York', days: '9d', tone: 'stale' as const },
  { title: 'Data Analyst', meta: 'Vercel · Hybrid', days: '4d', tone: 'fresh' as const },
  { title: 'iOS Engineer', meta: 'Notion · Remote', days: '1d', tone: 'fresh' as const },
]

export function MiniPhoneFrame() {
  return (
    <div className="mini-phone">
      <span className="mini-phone-island" />

      <div className="mini-phone-screen">
        <div className="mini-phone-status">
          <span className="mini-phone-time">9:41</span>
          <span className="mini-phone-signal">
            <Wifi aria-hidden="true" />
            <Battery aria-hidden="true" />
          </span>
        </div>

        <div className="mini-phone-head">
          <span className="mini-phone-mark">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6.5 3.5h11A1.5 1.5 0 0 1 19 5v15.4a.7.7 0 0 1-1.08.59L12 17.3l-5.92 3.69A.7.7 0 0 1 5 20.4V5a1.5 1.5 0 0 1 1.5-1.5Z"
                fill="currentColor"
              />
            </svg>
          </span>
          <span className="mini-phone-brand">JobVault</span>
        </div>

        <div className="mini-phone-label">Active · 4</div>

        <div className="mini-phone-list">
          {JOBS.map((job) => (
            <div className="mini-phone-card" key={job.title}>
              <div className="mini-phone-card-main">
                <span className="mini-phone-card-title">{job.title}</span>
                <span className="mini-phone-card-meta">{job.meta}</span>
              </div>
              <span className={`mini-phone-days mini-phone-days--${job.tone}`}>
                {job.tone === 'fresh' ? (
                  <Clock aria-hidden="true" />
                ) : (
                  <Timer aria-hidden="true" />
                )}
                {job.days}
              </span>
            </div>
          ))}
        </div>

        <div className="mini-phone-tabs">
          <LayoutDashboard className="mini-phone-tab--active" aria-hidden="true" />
          <FileText aria-hidden="true" />
          <Bell aria-hidden="true" />
          <User aria-hidden="true" />
        </div>

        <span className="mini-phone-home" />
      </div>

      <span className="mini-phone-tag">Mobile · in development</span>
    </div>
  )
}
