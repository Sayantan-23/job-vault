import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GenerateAnswerControls } from './generate-answer-controls'

const personas = [
  { id: 'p1', name: 'Backend' },
  { id: 'p2', name: 'Platform' },
]

describe('GenerateAnswerControls', () => {
  it('always shows the one-line note', () => {
    render(<GenerateAnswerControls personas={personas} question="Why?" onGenerate={vi.fn()} isGenerating={false} />)
    expect(screen.getByText(/sounds like you/i)).toBeInTheDocument()
  })

  it('disables generation when the question is empty', () => {
    render(<GenerateAnswerControls personas={personas} question="   " onGenerate={vi.fn()} isGenerating={false} />)
    expect(screen.getByRole('button', { name: /generate/i })).toBeDisabled()
  })

  it('generates with the selected persona and trimmed instructions', async () => {
    const onGenerate = vi.fn()
    render(<GenerateAnswerControls personas={personas} question="Why?" onGenerate={onGenerate} isGenerating={false} />)

    await userEvent.selectOptions(screen.getByLabelText(/persona/i), 'p2')
    await userEvent.type(screen.getByLabelText(/extra instructions/i), '  Be blunt  ')
    await userEvent.click(screen.getByRole('button', { name: /generate/i }))

    expect(onGenerate).toHaveBeenCalledWith({ personaId: 'p2', instructions: 'Be blunt' })
  })

  it('omits instructions entirely when blank', async () => {
    const onGenerate = vi.fn()
    render(<GenerateAnswerControls personas={personas} question="Why?" onGenerate={onGenerate} isGenerating={false} />)
    await userEvent.click(screen.getByRole('button', { name: /generate/i }))
    expect(onGenerate).toHaveBeenCalledWith({ personaId: 'p1' })
  })

  it('disables the button while generating', () => {
    render(<GenerateAnswerControls personas={personas} question="Why?" onGenerate={vi.fn()} isGenerating />)
    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled()
  })
})
