// Faithful miniature of a generated cover letter: white paper, a top-left
// stacked contact block, a real "Dear hiring team," greeting, paragraphs, and a
// "Sincerely," sign-off. No card-in-card, no rule lines — a plain business
// letter. `size="full"` (documents section) reads as a real letter: larger,
// letter-like type, and a real opening sentence before the grey bars stand in
// for the rest. `size="compact"` (hero collage, default) is the tiny surface.
// Presentational + server safe.
interface MiniLetterSheetProps {
  size?: 'compact' | 'full'
}

export function MiniLetterSheet({ size = 'compact' }: MiniLetterSheetProps = {}) {
  const full = size === 'full'
  return (
    <div className={full ? 'mini-letter mini-letter--full' : 'mini-letter'}>
      <div className="mini-letter-from">
        <div>Maya Okafor</div>
        <div>maya.okafor@mail.com</div>
        <div>San Francisco, CA</div>
      </div>

      <div className="mini-letter-greet">Dear hiring team,</div>

      <div className="mini-letter-para">
        {full && (
          <p className="mini-letter-lead">
            I have spent the last four years shipping data-heavy product at Ramp, and the Senior PM
            role reads like the work I already love.
          </p>
        )}
        <div className="mini-bar mini-w95" />
        <div className="mini-bar mini-w88" />
        <div className="mini-bar mini-w70" />
      </div>
      <div className="mini-letter-para">
        <div className="mini-bar mini-w88" />
        <div className="mini-bar mini-w80" />
        {full && <div className="mini-bar mini-w70" />}
      </div>

      <div className="mini-letter-sign">Sincerely,</div>
      <div className="mini-letter-name">Maya Okafor</div>
    </div>
  )
}
