import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './dialog'

// Neither shipped caller trips this: AddJobModal's first tabbable is the
// "From URL" tab button and ConfirmDialog holds only buttons, and `select: true`
// is a no-op on anything that is not a text input. The fixture below is what a
// caller leading with a text field would look like — the defect is latent in the
// primitive rather than live in the app, so it needs its own regression case.
function TextFirstDialog() {
  return (
    <Dialog open>
      <DialogContent>
        <DialogTitle>Rename</DialogTitle>
        <DialogDescription>Give this a new name.</DialogDescription>
        <label htmlFor="name">Name</label>
        <input id="name" defaultValue="Existing value" />
      </DialogContent>
    </Dialog>
  )
}

describe('DialogContent', () => {
  it('opens without selecting the first input’s text', () => {
    render(<TextFirstDialog />)

    const input = screen.getByLabelText('Name') as HTMLInputElement
    expect(document.activeElement).not.toBe(input)
    expect(input.selectionStart).toBe(input.selectionEnd)
  })

  it('still moves focus into the dialog so it is announced', () => {
    render(<TextFirstDialog />)

    expect(screen.getByRole('dialog')).toHaveFocus()
  })
})
