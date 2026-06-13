import { Fragment } from 'react'
import { parseCoverLetterMarkdown, type Line } from '@/lib/cover-letter-markdown'

function InlineRuns({ runs }: { runs: Line }) {
  return (
    <>
      {runs.map((run, i) => {
        if (run.type === 'bold') return <strong key={i} className="font-semibold">{run.text}</strong>
        if (run.type === 'link')
          return (
            <a key={i} href={run.href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
              {run.text}
            </a>
          )
        return <Fragment key={i}>{run.text}</Fragment>
      })}
    </>
  )
}

// Renders the cover-letter Markdown model as styled prose. Shares its parser with
// the PDF document so the on-screen preview and the downloaded PDF stay identical.
export function CoverLetterPreview({ body }: { body: string }) {
  const blocks = parseCoverLetterMarkdown(body)
  return (
    <div className="rounded-lg border border-border bg-card p-4 text-sm leading-relaxed text-foreground">
      {blocks.map((block, bi) => (
        <p key={bi} className="mb-3 last:mb-0 whitespace-normal">
          {block.lines.map((line, li) => (
            <Fragment key={li}>
              {li > 0 ? <br /> : null}
              <InlineRuns runs={line} />
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  )
}
