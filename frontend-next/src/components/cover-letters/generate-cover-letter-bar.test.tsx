import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Persona } from '@/types/persona'
import type { ProfileContent } from '@/types/profile'
import type { JobOption } from '@/hooks/use-job-options'
import { GenerateCoverLetterBar } from './generate-cover-letter-bar'

const DATA: ProfileContent = { basics: { name: 'A', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
const PERSONAS: Persona[] = [
  { id: 'p1', createdAt: '', updatedAt: '', userId: 'u1', name: 'Backend', data: DATA, rawInput: null },
  { id: 'p2', createdAt: '', updatedAt: '', userId: 'u1', name: 'Frontend', data: DATA, rawInput: null },
]
const JOBS: JobOption[] = [
  { id: 'j1', title: 'SWE', company: 'Acme' },
  { id: 'j2', title: 'Staff Engineer', company: 'Globex' },
]

function renderBar(overrides: Partial<Parameters<typeof GenerateCoverLetterBar>[0]> = {}) {
  const onGenerate = vi.fn()
  render(<GenerateCoverLetterBar personas={PERSONAS} jobs={JOBS} isPending={false} onGenerate={onGenerate} {...overrides} />)
  return { onGenerate }
}

describe('GenerateCoverLetterBar', () => {
  it('defaults to the tracked-job mode with a job select and no paste fields', () => {
    renderBar()
    expect(screen.getByRole('group', { name: 'Job source' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tracked job/i })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Job')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Select a job…' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'SWE — Acme' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Job title')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Company')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Job description')).not.toBeInTheDocument()
  })

  it('pre-selects the tracked job from initialJobId and sends it', async () => {
    const { onGenerate } = renderBar({ initialJobId: 'j2' })
    expect(screen.getByLabelText('Job')).toHaveValue('j2')
    await userEvent.click(screen.getByRole('button', { name: 'Generate cover letter' }))
    expect(onGenerate).toHaveBeenCalledWith({ personaId: 'p1', jobId: 'j2' })
  })

  it('keeps Generate disabled when initialJobId is a stale id not among the loaded jobs', () => {
    renderBar({ initialJobId: 'ghost' })
    expect(screen.getByRole('button', { name: 'Generate cover letter' })).toBeDisabled()
  })

  it('toggling to paste swaps the job select for title/company/description fields', async () => {
    renderBar()
    await userEvent.click(screen.getByRole('button', { name: /paste a description/i }))
    expect(screen.queryByLabelText('Job')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Job title')).toBeInTheDocument()
    expect(screen.getByLabelText('Company')).toBeInTheDocument()
    expect(screen.getByLabelText('Job description')).toHaveAttribute(
      'placeholder',
      'Paste the job description (optional, but it makes the letter much better)',
    )
  })

  it('defaults the persona to the first one and sends a tracked payload without blank instructions', async () => {
    const { onGenerate } = renderBar()
    await userEvent.selectOptions(screen.getByLabelText('Job'), 'j2')
    await userEvent.click(screen.getByRole('button', { name: 'Generate cover letter' }))
    expect(onGenerate).toHaveBeenCalledWith({ personaId: 'p1', jobId: 'j2' })
  })

  it('includes trimmed instructions in the tracked payload when given', async () => {
    const { onGenerate } = renderBar()
    await userEvent.selectOptions(screen.getByLabelText('Job'), 'j1')
    await userEvent.type(screen.getByLabelText(/instructions/i), '  keep it short  ')
    await userEvent.click(screen.getByRole('button', { name: 'Generate cover letter' }))
    expect(onGenerate).toHaveBeenCalledWith({ personaId: 'p1', jobId: 'j1', instructions: 'keep it short' })
  })

  it('sends a paste payload with the trimmed inline job including its description', async () => {
    const { onGenerate } = renderBar()
    await userEvent.click(screen.getByRole('button', { name: /paste a description/i }))
    await userEvent.type(screen.getByLabelText('Job title'), '  Staff Eng  ')
    await userEvent.type(screen.getByLabelText('Company'), '  Initech  ')
    await userEvent.type(screen.getByLabelText('Job description'), '  We need a builder.  ')
    await userEvent.click(screen.getByRole('button', { name: 'Generate cover letter' }))
    expect(onGenerate).toHaveBeenCalledWith({
      personaId: 'p1',
      job: { title: 'Staff Eng', company: 'Initech', description: 'We need a builder.' },
    })
  })

  it('omits a blank description from the paste payload', async () => {
    const { onGenerate } = renderBar()
    await userEvent.click(screen.getByRole('button', { name: /paste a description/i }))
    await userEvent.type(screen.getByLabelText('Job title'), 'Staff Eng')
    await userEvent.type(screen.getByLabelText('Company'), 'Initech')
    await userEvent.type(screen.getByLabelText('Job description'), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Generate cover letter' }))
    expect(onGenerate).toHaveBeenCalledWith({ personaId: 'p1', job: { title: 'Staff Eng', company: 'Initech' } })
  })

  it('lets you pick another persona for the payload', async () => {
    const { onGenerate } = renderBar()
    await userEvent.selectOptions(screen.getByLabelText('Persona'), 'p2')
    await userEvent.selectOptions(screen.getByLabelText('Job'), 'j1')
    await userEvent.click(screen.getByRole('button', { name: 'Generate cover letter' }))
    expect(onGenerate).toHaveBeenCalledWith({ personaId: 'p2', jobId: 'j1' })
  })

  it('disables generate in tracked mode until a job is selected', async () => {
    renderBar()
    expect(screen.getByRole('button', { name: 'Generate cover letter' })).toBeDisabled()
    await userEvent.selectOptions(screen.getByLabelText('Job'), 'j1')
    expect(screen.getByRole('button', { name: 'Generate cover letter' })).toBeEnabled()
  })

  it('disables generate in paste mode until both title and company are non-blank', async () => {
    renderBar()
    await userEvent.click(screen.getByRole('button', { name: /paste a description/i }))
    const generate = () => screen.getByRole('button', { name: 'Generate cover letter' })
    expect(generate()).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Job title'), 'Staff Eng')
    expect(generate()).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Company'), '   ')
    expect(generate()).toBeDisabled()
    await userEvent.type(screen.getByLabelText('Company'), 'Initech')
    expect(generate()).toBeEnabled()
  })

  it('shows Generating… and disables the button while pending', () => {
    renderBar({ isPending: true })
    expect(screen.getByRole('button', { name: 'Generating…' })).toBeDisabled()
  })

  it('caps the paste inputs and instructions at the backend Zod limits', async () => {
    renderBar()
    expect(screen.getByLabelText(/instructions/i)).toHaveAttribute('maxlength', '2000')
    await userEvent.click(screen.getByRole('button', { name: /paste a description/i }))
    expect(screen.getByLabelText('Job title')).toHaveAttribute('maxlength', '255')
    expect(screen.getByLabelText('Company')).toHaveAttribute('maxlength', '255')
    expect(screen.getByLabelText('Job description')).toHaveAttribute('maxlength', '50000')
  })

  it('shows a switch-to-paste hint in tracked mode when there are no tracked jobs', () => {
    renderBar({ jobs: [] })
    expect(screen.getByText(/No tracked jobs yet — switch to "Paste a description"\./)).toBeInTheDocument()
    // The mode does not auto-switch — the picker (with its placeholder) stays.
    expect(screen.getByLabelText('Job')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tracked job/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('hides the no-jobs hint once tracked jobs exist', () => {
    renderBar()
    expect(screen.queryByText(/No tracked jobs yet/)).not.toBeInTheDocument()
  })
})
