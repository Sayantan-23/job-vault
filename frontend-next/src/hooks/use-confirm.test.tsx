import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useConfirm } from './use-confirm'

// A tiny harness component that exercises the hook like a real call site.
function Harness({ onResult }: { onResult: (v: boolean) => void }) {
  const { confirm, confirmDialog } = useConfirm()
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          const ok = await confirm({ title: 'Delete cover letter?', description: 'This cannot be undone.', confirmLabel: 'Delete', destructive: true })
          onResult(ok)
        }}
      >
        trigger
      </button>
      {confirmDialog}
    </>
  )
}

describe('useConfirm', () => {
  it('resolves true when the user confirms', async () => {
    const results: boolean[] = []
    render(<Harness onResult={(v) => results.push(v)} />)
    await userEvent.click(screen.getByRole('button', { name: 'trigger' }))
    expect(screen.getByText('Delete cover letter?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(results).toEqual([true]))
  })

  it('resolves false when the user cancels', async () => {
    const results: boolean[] = []
    render(<Harness onResult={(v) => results.push(v)} />)
    await userEvent.click(screen.getByRole('button', { name: 'trigger' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(results).toEqual([false]))
  })

  it('does not render the dialog content until confirm is called', () => {
    render(<Harness onResult={() => {}} />)
    expect(screen.queryByText('Delete cover letter?')).not.toBeInTheDocument()
  })
})
