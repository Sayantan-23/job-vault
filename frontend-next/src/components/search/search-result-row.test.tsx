import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SearchResultRow } from './search-result-row'
import type { SearchResult } from '@/types/search'

// The backend wraps matches in STX/ETX rather than HTML (see search.repository).
const STX = '\u0002'
const ETX = '\u0003'

function row(snippet: string | null) {
  const result: SearchResult = {
    type: 'job',
    id: 'j1',
    title: 'Senior Backend Engineer',
    subtitle: 'Monzo',
    snippet,
  }
  return render(
    <ul>
      <SearchResultRow result={result} id="opt-0" active={false} onSelect={() => {}} />
    </ul>,
  )
}

describe('SearchResultRow', () => {
  it('renders the matched fragment in a <mark> and the rest as plain text', () => {
    row(`we run ${STX}payroll${ETX} in-house`)

    expect(screen.getByText('payroll').tagName).toBe('MARK')
    expect(screen.getByRole('option')).toHaveTextContent('we run payroll in-house')
  })

  // One snippet source is jobs.snapshotMarkdown, scraped from third-party job
  // pages. ts_headline marks hits with control characters instead of <b>/</b>
  // precisely so a snippet can never be parsed as markup — this is the standing
  // guard on that path.
  it('renders markup inside a snippet as text, never as DOM', () => {
    const { container } = row(
      `<script>alert(1)</script> <img src=x onerror=alert(2)> ${STX}payroll${ETX}`,
    )

    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('<script>alert(1)</script>')
    expect(container.textContent).toContain('<img src=x onerror=alert(2)>')
    expect(screen.getByText('payroll').tagName).toBe('MARK')
  })

  it('names the result type for assistive tech, since the group label is decorative', () => {
    row(null)

    expect(screen.getByRole('option')).toHaveAccessibleName(/job/i)
  })
})
