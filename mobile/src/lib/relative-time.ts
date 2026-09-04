// Short calendar date, e.g. "May 28". Returns an em dash for empty/invalid input.
// Ported from frontend-next/src/lib/relative-time.ts — only the one helper C3
// needs; the relative ("3 hours ago") formatter is YAGNI on mobile until a
// screen calls it.
export function shortDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
