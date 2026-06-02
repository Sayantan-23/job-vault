import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Input } from './input'
import { Label } from './label'

describe('Input + Label', () => {
  it('renders an input associated with its label', () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <Input id="email" placeholder="you@example.com" />
      </>,
    )
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
  })
})
