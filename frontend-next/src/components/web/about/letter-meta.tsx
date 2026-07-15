// The letter's memo head — a mono meta rail beside the prose (FROM / RE / DATE),
// hairline-topped rows like the header of a typeset memo. This is the "markup"
// device that makes the letter read as set, not just centered. Presentational,
// server-safe. Styled by styles/web/pages/about.css.
const META: Array<{ k: string; v: string }> = [
  { k: 'From', v: 'the maker of JobVault' },
  { k: 'Re', v: 'the silence' },
  { k: 'Date', v: 'July 2026' },
]

export function LetterMeta() {
  return (
    <div className="letter-meta" aria-hidden="true">
      {META.map((row) => (
        <div className="letter-meta-row" key={row.k}>
          <span className="letter-meta-k">{row.k}</span>
          <span className="letter-meta-v">{row.v}</span>
        </div>
      ))}
    </div>
  )
}
