import { PullQuote } from './pull-quote'

// The letter: a first-person note from the maker. Centered column, but the prose
// itself is left-aligned (ragged-right) for readability — the COLUMN is what's
// centered on the page. One pull-quote sits mid-letter as the emotional pivot; a
// mono signature closes it. Styled by styles/web/pages/about.css.
export function MakerLetter() {
  return (
    <div className="maker-letter">
      <p>
        I started JobVault after one too many applications disappeared into nothing. No rejection,
        no reply, no next step — <em>just silence</em>, and no way to tell the difference between a
        slow week and a lead that had already gone cold.
      </p>
      <p>
        The tools I was using made it worse. Postings lived in a dozen open tabs, statuses in a
        spreadsheet I updated when I remembered, documents renamed and scattered across folders. The
        search itself became the hard part, and the silence hid inside the mess.
      </p>

      <PullQuote>
        You find out an application died by <em>forgetting it existed.</em>
      </PullQuote>

      <p>
        So here is the pitch, honestly. JobVault keeps the whole search in one place: capture a
        posting in a click, keep personas for the roles you actually want, draft résumés and cover
        letters with AI you fully control, and track every application on a single board.
      </p>
      <p>
        The part I care about most is that nothing goes quiet unnoticed. Every application carries a
        days-since-activity meter, and the cold ones get flagged instead of slipping away. The
        silence still happens — but now <em>you see it coming</em>.
      </p>
      <p>
        Why it&rsquo;s free: a job search is already lopsided enough without the tools taking a cut.
        Tracking, personas, and the extension cost nothing, and there&rsquo;s no card to enter. AI
        generation runs on an hourly rate limit — that&rsquo;s the only ceiling.
      </p>
      <p>
        It&rsquo;s built by one person, for the search I wish I&rsquo;d had. If it helps you land
        somewhere good, that&rsquo;s the whole point.
      </p>

      <div className="maker-sign">— the maker of JobVault</div>
    </div>
  )
}
