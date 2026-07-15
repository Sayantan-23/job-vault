// Three honest positions: a mono label + one plain sentence each, hairline
// rows. Styled by styles/web/pages/about.css.
const PRINCIPLES: Array<{ label: string; text: string }> = [
  {
    label: 'Free',
    text: 'Tracking, personas, and the extension are free. AI generation runs on an hourly rate limit, and no card is ever required.',
  },
  {
    label: 'Your words',
    text: 'The AI drafts only from what you wrote. Nothing is sent anywhere without you reviewing it first.',
  },
  {
    label: 'No lock-in',
    text: 'Documents export as PDF and LaTeX, and your data stays yours.',
  },
]

export function PrincipleList() {
  return (
    <div className="about-principles">
      {PRINCIPLES.map((p) => (
        <div className="principle-row" key={p.label}>
          <span className="principle-label">{p.label}</span>
          <p className="principle-text">{p.text}</p>
        </div>
      ))}
    </div>
  )
}
