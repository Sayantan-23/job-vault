import Markdown from 'react-markdown'
import { ExternalLink } from 'lucide-react'

export function JobSnapshot({ markdown, sourceUrl }: { markdown: string | null; sourceUrl: string | null }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Snapshot</h3>
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            View original
          </a>
        ) : null}
      </div>
      {markdown ? (
        <div className="prose prose-sm max-w-none text-foreground prose-headings:text-foreground prose-a:text-primary">
          <Markdown>{markdown}</Markdown>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No snapshot was captured for this job.</p>
      )}
    </div>
  )
}
