// Faithful miniature of a generated ATS résumé: white paper, centered bold
// name + contact line joined by a pipe, section titles with an accent bottom
// rule, a bold company/date row, and grey text bars standing in for bullets.
// Presentational + server safe.
export function MiniResumeSheet() {
  return (
    <div className="mini-resume">
      <div className="mini-resume-name">Maya Okafor</div>
      <div className="mini-resume-contact">maya.okafor@mail.com | San Francisco, CA</div>

      <div className="mini-resume-sec">Experience</div>
      <div className="mini-resume-row">
        <span className="mini-resume-co">Ramp</span>
        <span className="mini-resume-date">2021 to Now</span>
      </div>
      <div className="mini-bar mini-w95" />
      <div className="mini-bar mini-w80" />
      <div className="mini-bar mini-w88" />

      <div className="mini-resume-sec">Skills</div>
      <div className="mini-bar mini-w70" />
      <div className="mini-bar mini-w60" />
    </div>
  )
}
