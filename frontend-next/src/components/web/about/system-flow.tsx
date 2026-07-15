// The one-connected-system story as an ordered flow (01–05): a mono number
// gutter + a term/description stack, hairline-separated rows — not equal cards.
// Styled by styles/web/pages/about.css.
const STEPS: Array<{ term: string; desc: string }> = [
  {
    term: 'Capture',
    desc: 'Save any posting in one click with the Chrome extension, or paste a URL.',
  },
  {
    term: 'Personas',
    desc: 'Versions of your profile aimed at different roles — written by you, or imported from an existing résumé.',
  },
  {
    term: 'Documents',
    desc: 'AI drafts a résumé and cover letter for each job and persona; you review and edit every line, then export as PDF, LaTeX, or straight to Overleaf.',
  },
  {
    term: 'Pipeline',
    desc: 'Every application on one board — statuses, a per-job timeline, and reminders that keep the next step in view.',
  },
  {
    term: 'Ghost-proofing',
    desc: 'A days-since-activity meter arms on every application; cold ones get flagged automatically instead of slipping away.',
  },
]

export function SystemFlow() {
  return (
    <div className="about-flow">
      {STEPS.map((step, i) => (
        <div className="flow-row" key={step.term}>
          <span className="flow-num">{String(i + 1).padStart(2, '0')}</span>
          <div>
            <span className="flow-term">{step.term}</span>
            <p className="flow-desc">{step.desc}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
