// Faithful miniature of a generated cover letter: white paper, a top-left
// stacked contact block, a real "Dear hiring team," greeting, two paragraphs of
// grey bars, and a "Sincerely," sign-off. No stamp here (the documents section
// owns the TAILORED stamp). Presentational + server safe.
export function MiniLetterSheet() {
  return (
    <div className="mini-letter">
      <div className="mini-letter-from">
        <div>Maya Okafor</div>
        <div>maya.okafor@mail.com</div>
        <div>San Francisco, CA</div>
      </div>

      <div className="mini-letter-greet">Dear hiring team,</div>

      <div className="mini-letter-para">
        <div className="mini-bar mini-w95" />
        <div className="mini-bar mini-w88" />
        <div className="mini-bar mini-w70" />
      </div>
      <div className="mini-letter-para">
        <div className="mini-bar mini-w88" />
        <div className="mini-bar mini-w80" />
      </div>

      <div className="mini-letter-sign">Sincerely,</div>
      <div className="mini-letter-name">Maya Okafor</div>
    </div>
  )
}
