// The second half of /about: four numbered positions in the Linear Method mold —
// a mono index, a short serif title, one or two plain lines. Hairline between
// rows, no boxes. Styled by styles/web/pages/about.css.
const PRINCIPLES: Array<{ title: string; text: string }> = [
  {
    title: 'Free by default',
    text: 'Tracking, personas, and the extension cost nothing. AI generation runs on an hourly rate limit; no card, ever.',
  },
  {
    title: 'The AI drafts, you decide',
    text: 'Every document is generated from what you wrote, and nothing leaves without you reviewing each line.',
  },
  {
    title: 'No lock-in',
    text: 'Résumés export as PDF and LaTeX, or open straight in Overleaf. Your data is yours to take.',
  },
  {
    title: 'Built against silence',
    text: "Ghost-proofing isn't a feature bolted on. It's the reason the product exists.",
  },
]

export function Principles() {
  return (
    <section className="about-principles">
      <span className="eyebrow about-eyebrow">Principles</span>
      <div className="principle-list">
        {PRINCIPLES.map((p, i) => (
          <div className="principle" key={p.title}>
            <span className="principle-num">{String(i + 1).padStart(2, '0')}</span>
            <div className="principle-body">
              <h2 className="principle-title">{p.title}</h2>
              <p className="principle-text">{p.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
