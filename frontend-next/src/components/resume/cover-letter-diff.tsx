import { diffWords } from '@/lib/word-diff'

// Word-level diff of the current letter vs the proposed one, for the "Fix grammar"
// review where only a few words change. Insertions get a faint accent highlight;
// deletions are struck through and muted (not alarm-red — a fix isn't an error).
export function CoverLetterDiff({ current, proposed }: { current: string; proposed: string }) {
  const segments = diffWords(current, proposed)
  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
      {segments.map((seg, i) => {
        if (seg.op === 'insert') return <span key={i} className="rounded bg-primary/15 text-foreground">{seg.text}</span>
        if (seg.op === 'delete') return <span key={i} className="text-muted-foreground line-through">{seg.text}</span>
        return <span key={i}>{seg.text}</span>
      })}
    </div>
  )
}
