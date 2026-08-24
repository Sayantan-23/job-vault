// frontend-next/src/components/profile/profile-workspace.tsx
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { PageHeading } from '@/components/layout/app/page-heading'
import { AppPage } from '@/components/layout/app/app-page'
import { ProfileEditor } from './profile-editor'
import { useProfile, useUpdateProfile } from '@/hooks/use-profile'
import { emptyProfileContent, validateProfileContent } from '@/lib/profile'
import type { ProfileContent } from '@/types/profile'

// The profile is prefetched on the server (page.tsx) and hydrated into the
// cache before this renders, so the draft starts populated on first paint. The
// effect below covers the other case — a failed/slow server read, where the
// data arrives from the client fetch instead.
export function ProfileWorkspace() {
  const { data } = useProfile()
  const update = useUpdateProfile()
  const [draft, setDraft] = useState<ProfileContent>(() => data ?? emptyProfileContent())
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
    <AppPage>
      <PageHeading
        title="Profile"
        description="Your master record — reused when you build personas."
        actions={
          <>
            {update.isSuccess ? <span className="text-sm text-muted-foreground">Saved</span> : null}
            <Button type="button" onClick={save} disabled={update.isPending || nameMissing}>
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      />
      <div className="space-y-6">
        {errors.length > 0 ? (
          <div role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <p className="font-medium">Please fix the following:</p>
            <ul className="mt-1 list-inside list-disc">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {update.error ? (
          <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {update.error.message}
          </p>
        ) : null}

        <ProfileEditor value={draft} onChange={setDraft} />
      </div>
    </AppPage>
  )
}
