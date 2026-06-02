import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Textarea } from './textarea'

describe('Textarea', () => {
  it('renders with its placeholder and forwards props', () => {
    render(<Textarea placeholder="Notes…" defaultValue="hi" />)
    const el = screen.getByPlaceholderText('Notes…')
    expect(el).toBeInTheDocument()
    expect(el).toHaveValue('hi')
  })
})
