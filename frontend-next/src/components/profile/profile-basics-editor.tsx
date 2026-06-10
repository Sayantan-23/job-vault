// frontend-next/src/components/profile/profile-basics-editor.tsx
'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { LinksEditor } from './links-editor'
import type { ProfileBasics } from '@/types/profile'

interface Props {
  value: ProfileBasics
  onChange: (next: ProfileBasics) => void
}

export function ProfileBasicsEditor({ value, onChange }: Props) {
  const set = (partial: Partial<ProfileBasics>) => onChange({ ...value, ...partial })

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pb-name">Full name</Label>
          <Input id="pb-name" aria-label="Full name" placeholder="Your full name" value={value.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pb-email">Email</Label>
          <Input id="pb-email" aria-label="Email" placeholder="you@example.com" value={value.email ?? ''} onChange={(e) => set({ email: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pb-phone">Phone</Label>
          <Input id="pb-phone" aria-label="Phone" placeholder="+1 555 000 1234" value={value.phone ?? ''} onChange={(e) => set({ phone: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pb-location">Location</Label>
          <Input
            id="pb-location"
            aria-label="Location"
            placeholder="City, State"
            value={value.location ?? ''}
            onChange={(e) => set({ location: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Links</Label>
        <LinksEditor value={value.links} onChange={(links) => set({ links })} />
      </div>
    </div>
  )
}
