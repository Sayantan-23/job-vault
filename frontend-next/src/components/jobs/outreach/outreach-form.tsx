'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { JobContact, ContactChannel } from '@/types/contact'
import type { CreateContactValues } from '@/hooks/use-contacts'

const CHANNEL_LABELS: Record<ContactChannel, string> = {
  EMAIL: 'Email',
  LINKEDIN: 'LinkedIn',
  OTHER: 'Other',
}

export function OutreachForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
}: {
  initial?: JobContact
  onSubmit: (values: CreateContactValues) => void
  onCancel?: () => void
  isPending: boolean
}) {
  const [contact, setContact] = useState(initial?.contact ?? '')
  const [channel, setChannel] = useState<ContactChannel | ''>(initial?.channel ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = contact.trim()
    if (!trimmed) return
    const values: CreateContactValues = { contact: trimmed }
    if (channel) values.channel = channel
    const trimmedNotes = notes.trim()
    if (trimmedNotes) values.notes = trimmedNotes
    onSubmit(values)
    if (!initial) {
      setContact('')
      setChannel('')
      setNotes('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="space-y-1.5">
        <Label htmlFor="outreach-contact">Person</Label>
        <Input
          id="outreach-contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          placeholder="Name, email, or LinkedIn"
          maxLength={500}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="outreach-channel">Channel (optional)</Label>
        <Select
          id="outreach-channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value as ContactChannel | '')}
        >
          <option value="">—</option>
          {(Object.keys(CHANNEL_LABELS) as ContactChannel[]).map((c) => (
            <option key={c} value={c}>
              {CHANNEL_LABELS[c]}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="outreach-notes">Notes (optional)</Label>
        <Textarea
          id="outreach-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Met at the conference"
          rows={2}
          maxLength={2000}
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending || !contact.trim()}>
          {initial ? 'Save' : 'Add contact'}
        </Button>
        {onCancel ? (
          <Button type="button" size="sm" variant="softDestructive" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  )
}
