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
