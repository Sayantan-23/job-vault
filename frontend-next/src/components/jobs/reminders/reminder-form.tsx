'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export interface ReminderFormValues {
  message: string
  remindAt: string
}

export function ReminderForm({
  onSubmit,
  isPending,
}: {
  onSubmit: (values: ReminderFormValues) => void
  isPending: boolean
}) {
  const [message, setMessage] = useState('')
  const [when, setWhen] = useState('')

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!message.trim() || !when) return
    onSubmit({ message: message.trim(), remindAt: new Date(when).toISOString() })
    setMessage('')
    setWhen('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="space-y-1.5">
        <Label htmlFor="reminder-message">Reminder</Label>
        <Input
          id="reminder-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ping the recruiter"
          maxLength={500}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reminder-when">When</Label>
        <Input id="reminder-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
      </div>
      <Button type="submit" size="sm" disabled={isPending || !message.trim() || !when}>
        Add reminder
      </Button>
    </form>
  )
}
