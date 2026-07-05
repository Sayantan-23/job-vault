import { Clock, Timer } from 'lucide-react'

// Faithful miniature of a Jobs board column (see the real GhostMeter / dcard
// styling): a headed white card with two job cards, each carrying a freshness
// meter (clock = active/green, timer = stale/amber). Presentational + server
// safe — the collage in hero.tsx owns placement and motion.
export function MiniBoardColumn() {
  return (
    <div className="mini-board">
      <div className="mini-board-head">
        <span className="mini-chip">Interviewing</span>
        <span className="mini-board-count">2</span>
      </div>

      <div className="mini-jcard">
        <div className="mini-jtitle">Staff Engineer</div>
        <div className="mini-jmeta">Vercel · Remote</div>
        <div className="mini-ghost mini-ghost-fresh">
          <Clock aria-hidden="true" />
          <span>3d</span>
        </div>
      </div>

      <div className="mini-jcard">
        <div className="mini-jtitle">Product Designer</div>
        <div className="mini-jmeta">Linear · New York</div>
        <div className="mini-ghost mini-ghost-stale">
          <Timer aria-hidden="true" />
          <span>9d</span>
        </div>
      </div>
    </div>
  )
}
