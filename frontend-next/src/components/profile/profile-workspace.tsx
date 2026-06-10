// frontend-next/src/components/profile/profile-workspace.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ProfileEditor } from './profile-editor'
import { useProfile, useUpdateProfile } from '@/hooks/use-profile'
import { emptyProfileContent, validateProfileContent } from '@/lib/profile'
import type { ProfileContent } from '@/types/profile'

export function ProfileWorkspace() {
  const { data } = useProfile()
  const update = useUpdateProfile()
  const [draft, setDraft] = useState<ProfileContent>(emptyProfileContent())
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    if (data) setDraft(data)
  }, [data])

  const save = () => {
    const found = validateProfileContent(draft)
    setErrors(found)
    if (found.length > 0) return
    update.mutate(draft)
  }

  const nameMissing = !draft.basics.name.trim()

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-background py-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Your profile</h1>
          <p className="text-sm text-muted-foreground">Your master record — reused when you build personas.</p>
        </div>
        <div className="flex items-center gap-2">
          {update.isSuccess ? <span className="text-sm text-muted-foreground">Saved</span> : null}
          <Button type="button" onClick={save} disabled={update.isPending || nameMissing}>
            {update.isPending ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {errors.length > 0 ? (
        <div role="alert" className="my-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <p className="font-medium">Please fix the following:</p>
          <ul className="mt-1 list-inside list-disc">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {update.error ? (
        <p role="alert" className="my-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {update.error.message}
        </p>
      ) : null}

      <div className="py-6">
        <ProfileEditor value={draft} onChange={setDraft} />
      </div>
    </div>
  )
}
