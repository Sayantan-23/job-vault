// The ethics note, at the two moments of actual choice — never as a page-level
// banner, which earns banner-blindness within a week.
//
// Written to persuade rather than to disclaim: it names a consequence the user
// cares about (you will be asked about this out loud) instead of asserting a
// duty, uses no moral vocabulary, and points at what a model structurally
// cannot supply — the user's own reasons and specifics — rather than claiming
// AI output is bad. There is no dismiss state: the one-liner is quiet enough to
// live there permanently, and the longer note only exists while a draft does.
export function AiDraftNote({ placement }: { placement: 'control' | 'draft' }) {
  if (placement === 'control') {
    return (
      <p className="text-xs text-muted-foreground">
        Drafts are a starting point. The answer that gets you hired is the one that sounds like you.
      </p>
    )
  }

  return (
    <div className="rounded-md border border-hairline bg-accent/40 px-3.5 py-3">
      <p className="text-sm font-medium">Make it yours before you save it.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        A draft can’t know why you actually left, what you actually shipped, or how you’d say it out loud — and you will
        say it out loud, in the interview. Cut what isn’t true, add what only you know, keep your own voice.
      </p>
    </div>
  )
}
