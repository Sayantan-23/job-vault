const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'always' })

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// Renders an ISO timestamp as a coarse relative string (e.g. "3 hours ago").
// `now` is injectable so tests are deterministic.
export function relativeTime(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime()
  if (diff < MINUTE) return 'just now'
  if (diff < HOUR) return rtf.format(-Math.floor(diff / MINUTE), 'minute')
  if (diff < DAY) return rtf.format(-Math.floor(diff / HOUR), 'hour')
  return rtf.format(-Math.floor(diff / DAY), 'day')
}

// Short calendar date, e.g. "May 28". Returns an em dash for empty/invalid input.
export function shortDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Stable per-calendar-day key (local time), e.g. "2026-6-3" — used to bucket a
// timeline into day groups. Returns an empty string for invalid input so callers
// can skip it.
export function dayKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// Human day-group heading: "Today" / "Yesterday" / a weekday within the past
// week ("Monday") / otherwise a full date ("May 28, 2026"). `now` is injectable
// so tests stay deterministic.
export function dayGroupLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const dayDiff = Math.round((startOfDay(now) - startOfDay(d)) / DAY)
  if (dayDiff <= 0) return 'Today'
  if (dayDiff === 1) return 'Yesterday'
  if (dayDiff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
