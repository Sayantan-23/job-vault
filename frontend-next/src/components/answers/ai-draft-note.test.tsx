import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AiDraftNote } from './ai-draft-note'

describe('AiDraftNote', () => {
  it('renders the one-line form under a generate control', () => {
    render(<AiDraftNote placement="control" />)
    expect(screen.getByText(/sounds like you/i)).toBeInTheDocument()
    expect(screen.queryByText(/make it yours/i)).not.toBeInTheDocument()
  })

  it('renders the fuller form over a generated draft', () => {
    render(<AiDraftNote placement="draft" />)
    expect(screen.getByText(/make it yours before you save it/i)).toBeInTheDocument()
    expect(screen.getByText(/you will say it out loud, in the interview/i)).toBeInTheDocument()
  })
})
