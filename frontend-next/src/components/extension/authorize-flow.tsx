'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { InlineAuthForm } from '@/components/auth/inline-auth-form'
import { useOptionalCurrentUser } from '@/hooks/use-auth'
import { useCreateApiKey } from '@/hooks/use-api-keys'
import { isAllowedExtensionRedirect, redirectToExtension } from '@/lib/extension-authorize'

function Heading({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-1.5 text-center">
      <h1 className="font-serif text-3xl leading-none tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  )
}

export function AuthorizeFlow() {
  const params = useSearchParams()
  const redirectUri = params.get('redirect_uri')
  const state = params.get('state')
  const { data: user, isLoading, refetch } = useOptionalCurrentUser()
  const createKey = useCreateApiKey()
  const [connecting, setConnecting] = useState(false)

  // Refuse to mint a token unless the handoff target is a trusted extension
  // redirect — this is what stops a forged link from stealing a key.
  if (!redirectUri || !isAllowedExtensionRedirect(redirectUri)) {
    return (
      <Heading
        title="Invalid authorization link"
        body="This link is missing a trusted extension redirect, so we can’t complete the connection. Open it again from the JobVault extension."
      />
    )
  }

  // Narrowed to string by the guard above; capture it so the closure keeps the type.
  const redirectTarget = redirectUri
  function connect() {
    setConnecting(true)
    createKey.mutate('Chrome Extension', {
      onSuccess: (created) => {
        redirectToExtension(redirectTarget, created.rawKey, state)
      },
      onError: () => setConnecting(false),
    })
  }

  if (isLoading) {
    return <Heading title="One moment…" body="Checking your JobVault session." />
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Heading
          title="Connect the extension"
          body="Sign in or create an account to authorize the JobVault Chrome extension."
        />
        <InlineAuthForm onAuthenticated={() => void refetch()} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Heading
        title="Connect the extension"
        body="The JobVault extension will be able to save jobs to your account."
      />
      <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-card-foreground">
        Connecting as <span className="font-medium text-foreground">{user.email}</span>
      </div>
      {createKey.isError ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Couldn’t connect. Please try again.
        </p>
      ) : null}
      <Button type="button" className="w-full" onClick={connect} disabled={connecting || createKey.isPending}>
        {connecting || createKey.isPending ? 'Connecting…' : 'Connect'}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        You can revoke access anytime in Settings → Connected apps.
      </p>
    </div>
  )
}
