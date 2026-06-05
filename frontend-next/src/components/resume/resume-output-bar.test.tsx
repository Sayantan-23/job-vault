import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('@/hooks/use-resumes', () => ({ fetchResumeTex: vi.fn() }))
import { fetchResumeTex } from '@/hooks/use-resumes'
import { ResumeOutputBar } from './resume-output-bar'

const writeText = vi.fn()
beforeEach(() => {
  vi.clearAllMocks()
  Object.assign(navigator, { clipboard: { writeText } })
})

describe('ResumeOutputBar', () => {
  it('copies the derived .tex to the clipboard', async () => {
    vi.mocked(fetchResumeTex).mockResolvedValue({ tex: '\\documentclass...' })
    render(<ResumeOutputBar resumeId="res1" />)
    await userEvent.click(screen.getByRole('button', { name: /copy latex/i }))
    await waitFor(() => expect(fetchResumeTex).toHaveBeenCalledWith('res1'))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('\\documentclass...'))
  })
  it('renders an Open in Overleaf control', () => {
    render(<ResumeOutputBar resumeId="res1" />)
    expect(screen.getByRole('button', { name: /open in overleaf/i })).toBeInTheDocument()
  })
})
