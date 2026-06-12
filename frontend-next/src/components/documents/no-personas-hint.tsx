import Link from 'next/link'

// Generator gate shown when the user has no personas yet — only the
// generator is replaced; the document library below still renders.
// `noun` names the document being generated ('résumé' / 'cover letter').
export function NoPersonasHint({ noun }: { noun: string }) {
  return (
    <p role="status" className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
      <Link href="/app/personas" className="underline underline-offset-2 hover:text-foreground">
        Create a persona
      </Link>{' '}
      first, then come back to generate a {noun}.
    </p>
  )
}
