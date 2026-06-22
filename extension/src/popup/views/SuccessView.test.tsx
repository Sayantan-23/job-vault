import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SuccessView } from './SuccessView'

beforeEach(() => {
  vi.stubGlobal('chrome', { tabs: { create: vi.fn() } })
})
afterEach(() => vi.unstubAllGlobals())

const RESULT = { id: 'j1', title: 'SWE', company: 'Acme', status: 'WISHLIST', isDuplicate: false }

describe('SuccessView', () => {
  it('shows the saved job and opens it in the app', async () => {
    render(<SuccessView result={RESULT} serverUrl="http://localhost:3100" onDone={vi.fn()} />)
    expect(screen.getByText('Saved to JobVault')).toBeInTheDocument()
    expect(screen.getByText(/SWE/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /Open in JobVault/i }))
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'http://localhost:3100/app/jobs?job=j1' })
  })

  it('says "Already in JobVault" for a duplicate', () => {
    render(<SuccessView result={{ ...RESULT, isDuplicate: true }} serverUrl="http://localhost:3100" onDone={vi.fn()} />)
    expect(screen.getByText('Already in JobVault')).toBeInTheDocument()
  })
})
