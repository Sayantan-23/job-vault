import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConnectView } from './ConnectView'

beforeEach(() => {
  vi.stubGlobal('chrome', { runtime: { sendMessage: vi.fn() } })
})
afterEach(() => vi.unstubAllGlobals())

describe('ConnectView', () => {
  it('sends CONNECT and calls onConnected on success', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({ ok: true })
    const onConnected = vi.fn()
    render(<ConnectView onConnected={onConnected} />)
    await userEvent.click(screen.getByRole('button', { name: /Connect with JobVault/i }))
    await waitFor(() => expect(onConnected).toHaveBeenCalled())
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ type: 'JOBVAULT_CONNECT' })
  })

  it('surfaces the error when the connect fails', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockResolvedValue({ ok: false, error: 'Connection cancelled' })
    render(<ConnectView onConnected={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /Connect with JobVault/i }))
    expect(await screen.findByText('Connection cancelled')).toBeInTheDocument()
  })
})
