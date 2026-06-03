'use client'

import { useState } from 'react'
import { useAddTimelineEntry } from '@/hooks/use-timeline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export function TimelineAddForm({ jobId }: { jobId: string }) {
  const add = useAddTimelineEntry(jobId)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return
    const trimmedDescription = description.trim()
    add.mutate(
      { title: trimmedTitle, ...(trimmedDescription ? { description: trimmedDescription } : {}) },
      {
        onSuccess: () => {
          setTitle('')
          setDescription('')
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <div className="space-y-1.5">
        <Label htmlFor="timeline-note">Note</Label>
        <Input
          id="timeline-note"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Called the recruiter"
          maxLength={255}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="timeline-detail">Detail (optional)</Label>
        <Textarea
          id="timeline-detail"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add any extra context"
        />
      </div>
      <Button type="submit" variant="outline" size="sm" disabled={add.isPending || title.trim() === ''}>
        Add note
      </Button>
    </form>
  )
}
