import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnswerEditor } from './answer-editor'

const props = {
  initial: { question: '', answerShort: '', answerLong: '' },
  personas: [{ id: 'p1', name: 'Backend' }],
  aiEnabled: true,
  isSaving: false,
  onSave: vi.fn(),
  onGenerate: vi.fn(),
  isGenerating: false,
  draft: null,
  onAcceptDraft: vi.fn(),
  onDiscardDraft: vi.fn(),
}

describe('AnswerEditor', () => {
  it('shows a live character count for each variant', async () => {
    render(<AnswerEditor {...props} />)
    await userEvent.type(screen.getByLabelText(/short answer/i), 'hello')
    expect(screen.getByText(/5 characters/i)).toBeInTheDocument()
  })

  it('cannot save with no question', () => {
    render(<AnswerEditor {...props} initial={{ question: '', answerShort: 'x', answerLong: '' }} />)
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
  })

  it('cannot save with a question but neither variant', () => {
    render(<AnswerEditor {...props} initial={{ question: 'Why?', answerShort: '', answerLong: '' }} />)
    expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled()
  })

  it('saves the trimmed values', async () => {
    const onSave = vi.fn()
    render(
      <AnswerEditor
        {...props}
        onSave={onSave}
        initial={{ question: '  Why?  ', answerShort: ' Growth. ', answerLong: '' }}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(onSave).toHaveBeenCalledWith({ question: 'Why?', answerShort: 'Growth.', answerLong: '' })
  })

  it('shows the fuller note and both draft variants when a draft arrives', () => {
    render(<AnswerEditor {...props} draft={{ short: 'Short draft', long: 'Long draft' }} />)
    expect(screen.getByText(/make it yours before you save it/i)).toBeInTheDocument()
    expect(screen.getByText('Short draft')).toBeInTheDocument()
    expect(screen.getByText('Long draft')).toBeInTheDocument()
  })

  it('hides generation entirely when AI is off', () => {
    render(<AnswerEditor {...props} aiEnabled={false} />)
    expect(screen.queryByRole('button', { name: /generate/i })).not.toBeInTheDocument()
  })

  it('generates with the question as currently typed, not the saved one', async () => {
    const onGenerate = vi.fn()
    render(<AnswerEditor {...props} onGenerate={onGenerate} initial={{ question: 'Old?', answerShort: '', answerLong: '' }} />)

    await userEvent.clear(screen.getByLabelText(/question/i))
    await userEvent.type(screen.getByLabelText(/question/i), 'Edited?')
    await userEvent.click(screen.getByRole('button', { name: /generate/i }))

    expect(onGenerate).toHaveBeenCalledWith(expect.objectContaining({ question: 'Edited?' }))
  })
})
