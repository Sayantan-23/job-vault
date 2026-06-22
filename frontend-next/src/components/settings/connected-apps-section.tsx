'use client'

import { useState } from 'react'
import { Check, Copy, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SettingsSection } from './settings-section'
import { useConfirm } from '@/hooks/use-confirm'
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '@/hooks/use-api-keys'
import type { ConnectedApp, CreatedApiKey } from '@/types/extension'

function usedLabel(app: ConnectedApp): string {
  if (!app.lastUsedAt) return 'Never used'
  return `Last used ${new Date(app.lastUsedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

function RevealedKey({ created, onDone }: { created: CreatedApiKey; onDone: () => void }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(created.rawKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked — the key is still visible to copy by hand */
    }
  }
  return (
    <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/[0.04] p-4">
      <p className="text-sm font-medium text-foreground">Copy your key now — you won’t see it again.</p>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs text-foreground">
          {created.rawKey}
        </code>
        <Button type="button" variant="outline" size="sm" onClick={copy} aria-label="Copy key">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={onDone}>
        Done
      </Button>
    </div>
  )
}

export function ConnectedAppsSection() {
  const { data: apps, isLoading } = useApiKeys()
  const createKey = useCreateApiKey()
  const revokeKey = useRevokeApiKey()
  const { confirm, confirmDialog } = useConfirm()
  const [revealed, setRevealed] = useState<CreatedApiKey | null>(null)

  async function onRevoke(app: ConnectedApp) {
    const ok = await confirm({
      title: `Revoke “${app.name}”?`,
      description: 'Any extension using this key will be signed out and must reconnect.',
      confirmLabel: 'Revoke',
      destructive: true,
    })
    if (ok) revokeKey.mutate(app.id)
  }

  function onGenerate() {
    createKey.mutate('Manual key', { onSuccess: (created) => setRevealed(created) })
  }

  return (
    <SettingsSection
      title="Connected apps"
      description="Connect the JobVault Chrome extension to save jobs from LinkedIn, Indeed and more in one click."
    >
      <div className="rounded-xl border border-border">
        {isLoading ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">Loading…</p>
        ) : apps && apps.length > 0 ? (
          <ul>
            {apps.map((app) => (
              <li
                key={app.id}
                className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <KeyRound className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{app.name}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {app.keyPrefix}… · {usedLabel(app)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRevoke(app)}
                  disabled={revokeKey.isPending}
                  className="text-muted-foreground hover:text-destructive"
                >
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-3 text-sm text-muted-foreground">No extensions connected yet.</p>
        )}
      </div>

      {revealed ? (
        <RevealedKey created={revealed} onDone={() => setRevealed(null)} />
      ) : (
        <div className="space-y-1.5">
          <Button type="button" variant="outline" size="sm" onClick={onGenerate} disabled={createKey.isPending}>
            {createKey.isPending ? 'Generating…' : 'Generate a key manually'}
          </Button>
          <p className="text-xs text-muted-foreground">
            Most people connect with the extension’s one-click button. Use this only to paste a key by hand.
          </p>
        </div>
      )}

      {confirmDialog}
    </SettingsSection>
  )
}
